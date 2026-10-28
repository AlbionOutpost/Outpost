import { describe, expect, it } from "vitest";
import {
  isEdgeChallenge,
  mayReportChallengeBlocked,
} from "../scripts/cloudflare-deployment-check.mjs";

describe("deployment edge challenge reporting", () => {
  it("recognizes the explicit Cloudflare challenge response", () => {
    expect(
      isEdgeChallenge(
        new Response(null, { status: 403, headers: { "cf-mitigated": "challenge" } }),
      ),
    ).toBe(true);
  });
  it("does not excuse an application or WAF denial without a challenge header", () => {
    expect(isEdgeChallenge(new Response("challenge", { status: 403 }))).toBe(false);
  });
  it("never excuses resource-limit or server failures", () => {
    expect(
      isEdgeChallenge(
        new Response(null, { status: 503, headers: { "cf-mitigated": "challenge" } }),
      ),
    ).toBe(false);
  });
  it("requires both GitHub Actions and the explicit reporting policy", () => {
    expect(
      mayReportChallengeBlocked({ GITHUB_ACTIONS: "true", OUTPOST_CI_REPORT_EDGE_CHALLENGE: "1" }),
    ).toBe(true);
    expect(mayReportChallengeBlocked({ GITHUB_ACTIONS: "true" })).toBe(false);
    expect(mayReportChallengeBlocked({ OUTPOST_CI_REPORT_EDGE_CHALLENGE: "1" })).toBe(false);
  });
});
