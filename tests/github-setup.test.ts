import { describe, it, expect } from "vitest";
import {
  setup,
  organization,
  repoPolicy,
  orgPolicy,
  manualOrgPolicy,
  branchPolicy,
} from "../scripts/github-setup.mjs";

function fixture(
  options: {
    role?: string;
    missing?: boolean;
    publicRepo?: boolean;
    rules403?: boolean;
    drift?: boolean;
    actionDrift?: boolean;
    selectionDelay?: boolean;
    selectionDrift?: boolean;
  } = {},
) {
  const calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  const repos: Record<string, Record<string, unknown>> = {};
  let patchedOrg = false;
  const state = new Map<string, unknown>();
  let selectionReads = 0;
  const api = async (method: string, path: string, body?: Record<string, unknown>) => {
    calls.push({ method, path, body });
    if (path === "user") return { login: "fixture-owner" };
    if (path.endsWith("/memberships/fixture-owner"))
      return { role: options.role || "admin", state: "active" };
    if (path === `orgs/${organization}`) {
      if (method === "PATCH") patchedOrg = true;
      return {
        login: organization,
        two_factor_requirement_enabled: true,
        ...(patchedOrg ? { ...orgPolicy, ...manualOrgPolicy } : {}),
      };
    }
    if (path === `orgs/${organization}/repos`) {
      const name = String(body?.name);
      repos[name] = {
        id: Object.keys(repos).length + 1,
        private: true,
        allow_forking: false,
        owner: { login: organization },
      };
      return repos[name];
    }
    const name = path.split("/")[2];
    if (path === `repos/${organization}/${name}`) {
      if (options.missing && !repos[name])
        throw Object.assign(new Error("not found"), { status: 404 });
      repos[name] ||= {
        id: Object.keys(repos).length + 1,
        private: !options.publicRepo,
        allow_forking: false,
        owner: { login: organization },
      };
      if (method === "PATCH") Object.assign(repos[name], body);
      return {
        ...repos[name],
        ...(options.drift && method === "GET" && repos[name].has_wiki === false
          ? { allow_forking: true }
          : {}),
      };
    }
    if (path.endsWith("/rulesets")) {
      if (options.rules403) throw Object.assign(new Error("plan"), { status: 403 });
      if (method === "GET") return [];
      state.set(`${path}/123`, { ...body, id: 123 });
      return { id: 123 };
    }
    if (path.endsWith("/automated-security-fixes")) return { enabled: true };
    if (
      method === "GET" &&
      path.startsWith("repos/") &&
      path.endsWith("/actions/permissions/selected-actions")
    )
      return state.get(`orgs/${organization}/actions/permissions/selected-actions`);
    if (method === "PUT") {
      if (
        path.startsWith("repos/") &&
        path.endsWith("/actions/permissions") &&
        !state.has(`orgs/${organization}/actions/permissions/selected-actions`)
      )
        throw new Error("Organization action allowlist must be configured first");
      state.set(path, body ?? null);
      return null;
    }
    if (state.has(path)) {
      const stored = state.get(path);
      if (path === `orgs/${organization}/actions/permissions/repositories`) {
        selectionReads++;
        if (options.selectionDrift || (options.selectionDelay && selectionReads === 1))
          return { repositories: [] };
        const ids = (stored as { selected_repository_ids: number[] }).selected_repository_ids;
        return { repositories: ids.map((id) => ({ id })) };
      }
      if (options.actionDrift && path.endsWith("/actions/permissions"))
        return { ...(stored as Record<string, unknown>), sha_pinning_required: false };
      return stored;
    }
    throw new Error(`Unhandled fixture ${method} ${path}`);
  };
  return { api, calls };
}

describe("GitHub private repository setup", () => {
  it("plans without any mutation", async () => {
    const f = fixture();
    const report = await setup(f.api);
    expect("status" in report && report.status).toContain("PLAN ONLY");
    expect(f.calls.every((call) => call.method === "GET")).toBe(true);
  });
  it("requires an active organization owner before writes", async () => {
    const f = fixture({ role: "member" });
    await expect(setup(f.api, true)).rejects.toThrow("owner permission");
    expect(f.calls.every((call) => call.method === "GET")).toBe(true);
  });
  it("creates only missing private repositories, verifies least privilege and never uploads code", async () => {
    const f = fixture({ missing: true });
    const result = await setup(f.api, true);
    const creates = f.calls.filter((call) => call.path === `orgs/${organization}/repos`);
    expect(creates).toHaveLength(2);
    expect(
      creates.every((call) => call.body?.private === true && call.body?.auto_init === false),
    ).toBe(true);
    expect(
      f.calls.some((call) => /contents|git\/|advanced_security|secret_scanning/.test(call.path)),
    ).toBe(false);
    expect(result.checks.filter((c: { status: string }) => c.status === "VERIFIED")).toHaveLength(
      10,
    );
    expect(repoPolicy.allow_forking).toBe(false);
  });
  it("does not silently adopt a public repository", async () => {
    const f = fixture({ publicRepo: true });
    await expect(setup(f.api, true)).rejects.toThrow("public repository");
    expect(
      f.calls.filter((call) => call.method === "PATCH" && call.path.startsWith("repos/")),
    ).toHaveLength(0);
  });
  it("reports unavailable private rulesets without inventing protection or buying a plan", async () => {
    const f = fixture({ rules403: true });
    const report = await setup(f.api, true);
    expect(
      report.checks.filter((c: { status: string }) => c.status.startsWith("BLOCKED")),
    ).toHaveLength(2);
    expect(
      branchPolicy("outpost").rules.some(
        (rule: { type: string }) => rule.type === "required_status_checks",
      ),
    ).toBe(true);
    expect(
      branchPolicy("outpost-operations").rules.some(
        (rule: { type: string }) => rule.type === "required_status_checks",
      ),
    ).toBe(false);
  });
  it("does not report a mutation as verified when read-back drifts", async () => {
    const f = fixture({ drift: true });
    await expect(setup(f.api, true)).rejects.toThrow("allow_forking was not verified");
  });
  it("restricts organization Actions and prevents unsafe fork execution and cross-repository access", async () => {
    const f = fixture({ missing: true });
    await setup(f.api, true);
    const bodyFor = (path: string) =>
      f.calls.find((call) => call.method === "PUT" && call.path === path)?.body;
    expect(bodyFor(`orgs/${organization}/actions/permissions`)).toEqual({
      enabled_repositories: "selected",
      allowed_actions: "selected",
      sha_pinning_required: true,
    });
    expect(bodyFor(`orgs/${organization}/actions/permissions/repositories`)).toEqual({
      selected_repository_ids: [1, 2],
    });
    expect(bodyFor(`orgs/${organization}/actions/permissions/selected-actions`)).toEqual({
      github_owned_allowed: false,
      verified_allowed: false,
      patterns_allowed: ["actions/checkout@*", "actions/setup-node@*"],
    });
    for (const name of ["outpost", "outpost-operations"]) {
      const prefix = `repos/${organization}/${name}/actions/permissions`;
      expect(bodyFor(`${prefix}/fork-pr-workflows-private-repos`)).toEqual({
        run_workflows_from_fork_pull_requests: false,
        send_write_tokens_to_workflows: false,
        send_secrets_and_variables: false,
      });
      expect(bodyFor(`${prefix}/access`)).toEqual({ access_level: "none" });
      expect(bodyFor(`${prefix}/artifact-and-log-retention`)).toEqual({ days: 14 });
    }
    const orgPatch = f.calls.find(
      (call) => call.method === "PATCH" && call.path === `orgs/${organization}`,
    )?.body;
    expect(orgPatch).not.toHaveProperty("members_can_create_internal_repositories");
    expect(orgPatch).not.toHaveProperty("members_can_change_repo_visibility");
    expect(
      f.calls
        .filter((call) => call.method === "PATCH" && call.path.startsWith("repos/"))
        .every((call) => !Object.hasOwn(call.body ?? {}, "allow_forking")),
    ).toBe(true);
  });
  it("rejects a silent failure to enforce SHA pinning", async () => {
    const f = fixture({ actionDrift: true });
    await expect(setup(f.api, true)).rejects.toThrow("sha_pinning_required was not verified");
  });
  it("allows bounded repository-selection propagation without replaying the write", async () => {
    const f = fixture({ selectionDelay: true });
    await setup(f.api, true);
    expect(
      f.calls.filter(
        (call) =>
          call.method === "PUT" &&
          call.path === `orgs/${organization}/actions/permissions/repositories`,
      ),
    ).toHaveLength(1);
    expect(
      f.calls.filter(
        (call) =>
          call.method === "GET" &&
          call.path === `orgs/${organization}/actions/permissions/repositories`,
      ),
    ).toHaveLength(2);
  });
  it("fails when repository selection remains different after bounded reads", async () => {
    const f = fixture({ selectionDrift: true });
    await expect(setup(f.api, true)).rejects.toThrow("repository selection was not verified");
    expect(f.calls.some((call) => call.method === "PATCH" && call.path.startsWith("repos/"))).toBe(
      false,
    );
  });
});
