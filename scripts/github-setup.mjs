import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export const organization = "AlbionOutpost";
export const repositories = ["outpost", "outpost-operations"];
export const orgPolicy = {
  default_repository_permission: "none",
  members_can_create_repositories: false,
  members_can_create_public_repositories: false,
  members_can_create_private_repositories: false,
  members_can_fork_private_repositories: false,
  members_can_create_pages: false,
  members_can_create_public_pages: false,
  members_can_create_private_pages: false,
};
// These values are readable but not writable through the organization REST API.
export const manualOrgPolicy = {
  members_can_change_repo_visibility: false,
  members_can_delete_repositories: false,
  members_can_invite_outside_collaborators: false,
};
export const repoPolicy = {
  private: true,
  allow_forking: false,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  allow_squash_merge: true,
  allow_auto_merge: false,
  delete_branch_on_merge: true,
  has_wiki: false,
  has_projects: false,
};
const workflowPolicy = {
  default_workflow_permissions: "read",
  can_approve_pull_request_reviews: false,
};
const actionPolicy = { enabled: true, allowed_actions: "selected", sha_pinning_required: true };
const selectedActions = {
  github_owned_allowed: false,
  verified_allowed: false,
  patterns_allowed: ["actions/checkout@*", "actions/setup-node@*"],
};
const forkWorkflowPolicy = {
  run_workflows_from_fork_pull_requests: false,
  send_write_tokens_to_workflows: false,
  send_secrets_and_variables: false,
};
export function branchPolicy(repo) {
  return {
    name: "Outpost default branch protection",
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "required_linear_history" },
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
        },
      },
      ...(repo === "outpost"
        ? [
            {
              type: "required_status_checks",
              parameters: {
                strict_required_status_checks_policy: true,
                required_status_checks: [{ context: "quality" }],
              },
            },
          ]
        : []),
    ],
  };
}
export function ghApi(method, path, body) {
  try {
    const result = execFileSync(
      "gh",
      [
        "api",
        "--hostname",
        "github.com",
        "--method",
        method,
        path,
        "-H",
        "Accept: application/vnd.github+json",
        ...(body === undefined ? [] : ["--input", "-"]),
      ],
      {
        input: body === undefined ? undefined : JSON.stringify(body),
        encoding: "utf8",
        timeout: 30000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return result.trim() ? JSON.parse(result) : null;
  } catch (error) {
    let status = Number(String(error.stderr || "").match(/\(HTTP (\d{3})\)/)?.[1]) || null;
    if (!status) {
      try {
        status = Number(JSON.parse(String(error.stdout || "")).status) || null;
      } catch {
        // Network and CLI errors need not include an API response body.
      }
    }
    const safe = new Error(
      `GitHub ${method} ${path} failed${status ? ` (HTTP ${status})` : ": connection, login or CLI unavailable"}`,
    );
    safe.status = status;
    throw safe;
  }
}
function assertFields(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (!isDeepStrictEqual(actual?.[key], value))
      throw new Error(`${label}: ${key} was not verified`);
  }
}
async function configurePolicy(api, path, policy) {
  await api("PUT", path, policy);
  assertFields(await api("GET", path), policy, path);
}
export async function setup(api = ghApi, apply = false) {
  const report = { organization, apply, repositories, checks: [] };
  const user = await api("GET", "user");
  if (!user?.login) throw new Error("Cannot verify authenticated user");
  const org = await api("GET", `orgs/${organization}`);
  if (org?.login?.toLowerCase() !== organization.toLowerCase())
    throw new Error("Organization identity mismatch");
  const membership = await api("GET", `orgs/${organization}/memberships/${user.login}`);
  if (membership?.role !== "admin" || membership?.state !== "active")
    throw new Error("Active organization owner permission required; no changes made");
  report.checks.push({
    control: "Organization MFA requirement",
    status: org.two_factor_requirement_enabled === true ? "VERIFIED" : "MANUAL ACTION REQUIRED",
  });
  if (!apply) return { ...report, status: "PLAN ONLY: no remote changes" };
  await api("PATCH", `orgs/${organization}`, orgPolicy);
  assertFields(await api("GET", `orgs/${organization}`), orgPolicy, "Organization policy");
  report.checks.push({ control: "Organization least privilege", status: "VERIFIED" });
  const updatedOrg = await api("GET", `orgs/${organization}`);
  for (const [field, expected] of Object.entries(manualOrgPolicy)) {
    report.checks.push({
      control: `Organization ${field}`,
      status: updatedOrg[field] === expected ? "VERIFIED" : "MANUAL ACTION REQUIRED",
    });
  }
  const repositoryIds = [];
  for (const name of repositories) {
    const path = `repos/${organization}/${name}`;
    let repo;
    try {
      repo = await api("GET", path);
    } catch (error) {
      if (error.status !== 404) throw error;
      repo = await api("POST", `orgs/${organization}/repos`, {
        name,
        private: true,
        auto_init: false,
        description:
          name === "outpost"
            ? "Outpost Albion Online companion platform"
            : "Outpost deployment configuration and operational documentation; no secrets",
      });
    }
    if (repo?.private !== true || repo?.owner?.login?.toLowerCase() !== organization.toLowerCase())
      throw new Error(`${name}: unexpected ownership or public repository; refusing to modify`);
    if (!Number.isSafeInteger(repo.id) || repo.id <= 0)
      throw new Error(`${name}: missing repository ID`);
    repositoryIds.push(repo.id);
  }
  const orgActionsPath = `orgs/${organization}/actions/permissions`;
  await configurePolicy(api, orgActionsPath, {
    enabled_repositories: "selected",
    allowed_actions: "selected",
    sha_pinning_required: true,
  });
  await api("PUT", `${orgActionsPath}/repositories`, { selected_repository_ids: repositoryIds });
  let selectionVerified = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await delay(500);
    const selected = await api("GET", `${orgActionsPath}/repositories`);
    selectionVerified = isDeepStrictEqual(
      selected.repositories?.map((repo) => repo.id).sort(),
      [...repositoryIds].sort(),
    );
    if (selectionVerified) break;
  }
  if (!selectionVerified)
    throw new Error("Organization Actions repository selection was not verified");
  await configurePolicy(api, `${orgActionsPath}/selected-actions`, selectedActions);
  await configurePolicy(api, `${orgActionsPath}/workflow`, workflowPolicy);
  await configurePolicy(
    api,
    `${orgActionsPath}/fork-pr-workflows-private-repos`,
    forkWorkflowPolicy,
  );
  await configurePolicy(api, `${orgActionsPath}/fork-pr-contributor-approval`, {
    approval_policy: "all_external_contributors",
  });
  await configurePolicy(api, `${orgActionsPath}/artifact-and-log-retention`, { days: 14 });
  report.checks.push({
    control:
      "Organization Actions: selected repositories, pinned checkout/setup-node only, read-only tokens, fork isolation and 14-day retention",
    status: "VERIFIED",
  });
  for (const name of repositories) {
    const path = `repos/${organization}/${name}`;
    // GitHub rejects even allow_forking:false when the organization already bans forks.
    const { allow_forking: _forking, ...writableRepoPolicy } = repoPolicy;
    await api("PATCH", path, writableRepoPolicy);
    assertFields(await api("GET", path), repoPolicy, name);
    await api("PUT", `${path}/actions/permissions`, actionPolicy);
    // The repository inherits the enforced organization allowlist; overriding it returns 409.
    await api("PUT", `${path}/actions/permissions/workflow`, workflowPolicy);
    assertFields(await api("GET", `${path}/actions/permissions`), actionPolicy, `${name} actions`);
    assertFields(
      await api("GET", `${path}/actions/permissions/selected-actions`),
      selectedActions,
      `${name} allowed actions`,
    );
    assertFields(
      await api("GET", `${path}/actions/permissions/workflow`),
      workflowPolicy,
      `${name} token permissions`,
    );
    await configurePolicy(
      api,
      `${path}/actions/permissions/fork-pr-workflows-private-repos`,
      forkWorkflowPolicy,
    );
    await configurePolicy(api, `${path}/actions/permissions/access`, { access_level: "none" });
    await configurePolicy(api, `${path}/actions/permissions/artifact-and-log-retention`, {
      days: 14,
    });
    await api("PUT", `${path}/vulnerability-alerts`);
    await api("GET", `${path}/vulnerability-alerts`);
    await api("PUT", `${path}/automated-security-fixes`);
    const fixes = await api("GET", `${path}/automated-security-fixes`);
    if (fixes?.enabled !== true) throw new Error(`${name}: automated security fixes not verified`);
    report.checks.push({
      control: `${name}: private, no forks, restricted Actions, read-only tokens, Dependabot`,
      status: "VERIFIED",
    });
    // Private rulesets can require a paid plan. Never enable paid security products automatically.
    try {
      const policy = branchPolicy(name);
      const rules = await api("GET", `${path}/rulesets`);
      const existing = rules.filter((r) => r.name === policy.name);
      if (existing.length > 1) throw new Error("Duplicate managed rulesets require manual review");
      const created = await api(
        existing.length ? "PUT" : "POST",
        `${path}/rulesets${existing.length ? `/${existing[0].id}` : ""}`,
        policy,
      );
      const verified = await api("GET", `${path}/rulesets/${created.id}`);
      assertFields(
        verified,
        {
          enforcement: "active",
          target: "branch",
          bypass_actors: [],
          conditions: policy.conditions,
        },
        `${name} ruleset`,
      );
      for (const rule of policy.rules) {
        if (
          !verified.rules?.some(
            (actual) =>
              actual.type === rule.type &&
              (!rule.parameters || isDeepStrictEqual(actual.parameters, rule.parameters)),
          )
        )
          throw new Error(`${name}: ${rule.type} ruleset not verified`);
      }
      report.checks.push({ control: `${name}: branch rules`, status: "VERIFIED" });
    } catch (error) {
      if (error.status !== 403) throw error;
      report.checks.push({
        control: `${name}: branch rules`,
        status: "BLOCKED: inspect plan or administrator permissions (HTTP403)",
      });
    }
  }
  report.checks.push({
    control:
      "Secret scanning/push protection, credential history, initial code upload and hosted CI",
    status: "NOT VERIFIED; no paid products enabled or files uploaded",
  });
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).some((arg) => arg !== "--apply")) {
    console.error("Usage: node scripts/github-setup.mjs [--apply]");
    process.exitCode = 1;
  } else {
    setup(ghApi, process.argv.includes("--apply"))
      .then((report) => console.log(JSON.stringify(report, null, 2)))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  }
}
