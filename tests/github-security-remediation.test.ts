import { describe, expect, it } from "vitest";
import { remediateRepository, matchesPolicy } from "../scripts/github-security-remediation.mjs";
function fixture(drift = false) {
  const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
  let rule: Record<string, unknown> | null = null,
    protectedSecrets = false;
  const api = async (method: string, path: string, body: Record<string, unknown>) => {
    if (method !== "GET") writes.push({ method, path, body });
    path = path.split("?")[0];
    if (path.endsWith("/rulesets")) {
      if (method === "POST") rule = { id: 1, ...body };
      return rule ? [rule] : [];
    }
    if (path.endsWith("/rulesets/1"))
      return { ...rule, ...(drift ? { bypass_actors: [{ actor_id: 1 }] } : {}) };
    if (method === "PATCH") protectedSecrets = true;
    return {
      full_name: "AlbionOutpost/Outpost",
      security_and_analysis: {
        secret_scanning_push_protection: { status: protectedSecrets ? "enabled" : "disabled" },
      },
    };
  };
  return { writes, api };
}
describe("scoped GitHub security remediation", () => {
  it("accepts provider defaults and unordered lists, while rejecting disabled controls or bypasses", () => {
    expect(matchesPolicy({ enabled: true, defaults: [] }, { enabled: true })).toBe(true);
    expect(matchesPolicy(["browser", "checks"], ["checks", "browser"])).toBe(true);
    expect(matchesPolicy({ enabled: false }, { enabled: true })).toBe(false);
    expect(matchesPolicy([{ actor_id: 1 }], [])).toBe(false);
    expect(
      matchesPolicy({ do_not_enforce_on_create: true }, { do_not_enforce_on_create: false }),
    ).toBe(false);
  });
  it("is read-only by default and requires the actual Actions check names", async () => {
    const f = fixture();
    const result = await remediateRepository(f.api);
    expect(f.writes).toHaveLength(0);
    const checks = result.plan!.ruleset.rules.find(
      (r: { type: string }) => r.type === "required_status_checks",
    );
    expect(checks?.parameters?.required_status_checks).toEqual([
      { context: "checks", integration_id: 15368 },
      { context: "browser", integration_id: 15368 },
    ]);
  });
  it("adds only owned rules and secret push protection, verifies, and is idempotent", async () => {
    const f = fixture();
    const snapshot: unknown[] = [];
    expect((await remediateRepository(f.api, true, (x: unknown) => snapshot.push(x))).ruleset).toBe(
      "verified",
    );
    expect(snapshot).toHaveLength(1);
    expect(f.writes).toHaveLength(2);
    expect(f.writes[1].body).toEqual({
      security_and_analysis: { secret_scanning_push_protection: { status: "enabled" } },
    });
    await remediateRepository(f.api, true);
    expect(f.writes).toHaveLength(2);
  });
  it("rejects another repository and refuses unverified or weakened readback", async () => {
    await expect(
      remediateRepository(async () => ({ full_name: "Other/Repo" }), true),
    ).rejects.toThrow("another repository");
    const f = fixture(true);
    await expect(remediateRepository(f.api, true)).rejects.toThrow("readback");
  });
});
