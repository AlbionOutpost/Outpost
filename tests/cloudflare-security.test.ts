import { describe, it, expect, vi } from "vitest";
import { containsExpected, ensureRule, securitySettings } from "../scripts/cloudflare-security.mjs";
describe("Cloudflare security deployment preservation", () => {
  it("requires strict TLS and HTTPS without prematurely preloading every subdomain", () => {
    expect(securitySettings).toMatchObject({
      ssl: "strict",
      min_tls_version: "1.2",
      always_use_https: "on",
    });
    expect(securitySettings).not.toHaveProperty("security_header");
  });
  it("accepts provider-added defaults without treating them as configuration drift", () => {
    expect(containsExpected({ id: "managed-id", version: "latest" }, { id: "managed-id" })).toBe(
      true,
    );
    expect(containsExpected({ id: "other-id" }, { id: "managed-id" })).toBe(false);
  });
  it("appends an owned rule without replacing unrelated existing rules", async () => {
    const rule = { ref: "owned", action: "block", expression: "true", enabled: true };
    const api = vi
      .fn()
      .mockResolvedValueOnce({ result: { id: "ruleset", rules: [{ ref: "unrelated" }] } })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ result: { rules: [rule] } });
    expect(await ensureRule(api, "zone", "phase", rule)).toMatchObject({
      status: "applied-and-read-back",
    });
    expect(api.mock.calls[1]).toEqual(["POST", "/zones/zone/rulesets/ruleset/rules", rule]);
    expect(api.mock.calls.some(([method]) => method === "PUT" || method === "DELETE")).toBe(false);
  });
  it("refuses overwriting changed owned rules and never interprets denied reads as absence", async () => {
    const rule = { ref: "owned", action: "block", expression: "true", enabled: true };
    const drift = vi
      .fn()
      .mockResolvedValue({ result: { rules: [{ ...rule, expression: "false" }] } });
    await expect(ensureRule(drift, "zone", "phase", rule)).rejects.toThrow(/differs/);
    expect(drift).toHaveBeenCalledTimes(1);
    const denied = vi.fn().mockRejectedValue(Error("HTTP 403"));
    await expect(ensureRule(denied, "zone", "phase", rule)).rejects.toThrow(/403/);
    expect(denied).toHaveBeenCalledTimes(1);
  });
});
