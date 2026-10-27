import { expect, it } from "vitest";
import { scanText } from "../scripts/qa-source-secrets.mjs";

it("detects configured secrets and key/token markers without returning credential contents", () => {
  const configured = "fixture-only-" + "sensitive-value";
  expect(scanText(`prefix ${configured} suffix`, { SESSION: configured })).toEqual([
    "configured:SESSION",
  ]);
  expect(JSON.stringify(scanText(configured, { SESSION: configured }))).not.toContain(configured);
  const token = "gh" + "p_" + "x".repeat(36);
  expect(scanText(token)).toEqual(["github-token"]);
  const key = "-----BEGIN " + "PRIVATE KEY-----";
  expect(scanText(key)).toEqual(["private-key"]);
  expect(scanText("NEXTAUTH_SECRET=\npublic documentation")).toEqual([]);
});
