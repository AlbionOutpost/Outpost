import { describe, expect, it } from "vitest";
import {
  isEdgeChallenge,
  mayReportChallengeBlocked,
  servedVersion,
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

describe("served version check", () => {
  const answers = (...versions: (string | null)[]) => {
    const asked: string[] = [];
    const get = async (url: string) => {
      asked.push(url);
      const version = versions[Math.min(asked.length, versions.length) - 1];
      return new Response("Not found", {
        status: 404,
        headers: version ? { "x-outpost-version": version } : {},
      });
    };
    return { asked, get: get as unknown as typeof fetch };
  };
  it("waits until the edge answers with the deployed version", async () => {
    const edge = answers("old", "old", "new");
    expect(await servedVersion("new", { wait: 0, get: edge.get })).toBe("new");
    expect(edge.asked).toHaveLength(3);
    expect(new URL(edge.asked[0]).pathname).toBe("/wp-admin");
  });
  it("reports the stale version when the edge never switches", async () => {
    const edge = answers(null);
    expect(await servedVersion("new", { tries: 3, wait: 0, get: edge.get })).toBe(null);
    expect(edge.asked).toHaveLength(3);
  });
});
