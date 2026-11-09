import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isEdgeChallenge(response) {
  return response.status === 403 && response.headers.get("cf-mitigated") === "challenge";
}

export function mayReportChallengeBlocked(env) {
  return env.GITHUB_ACTIONS === "true" && env.OUTPOST_CI_REPORT_EDGE_CHALLENGE === "1";
}

/** Polls a probe path (a bare 404 from the Worker, no app render) until the edge answers with the
 * expected version. Cloudflare can report a deployment as live while the edge keeps running the
 * previous version (9 Nov 2026: three releases of both Workers never served). */
export async function servedVersion(expected, { tries = 30, wait = 10000, get = fetch } = {}) {
  let served = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt) await new Promise((done) => setTimeout(done, wait));
    const response = await get("https://albionoutpost.com/wp-admin", {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (isEdgeChallenge(response)) return null;
    served = response.headers.get("x-outpost-version");
    if (served === expected) break;
  }
  return served;
}

async function main() {
  const folder = ".qa/cloudflare-launch";
  mkdirSync(folder, { recursive: true });
  const report = (value) => {
    const result = { checkedAt: new Date().toISOString(), ...value };
    writeFileSync(`${folder}/deployment-check.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  };
  const response = await fetch("https://albionoutpost.com/", {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  if (isEdgeChallenge(response)) {
    report({
      status: "BLOCKED",
      reason: "Cloudflare managed challenge stopped this runner before the application",
      applicationVerifiedFromRunner: false,
      protectionDisabled: false,
    });
    if (!mayReportChallengeBlocked(process.env))
      throw new Error("Public HTTPS verification blocked by Cloudflare challenge");
    const warning =
      "Public HTTPS/OAuth checks BLOCKED by Cloudflare managed challenge. Deployment and native-runtime tests are separate; this runner did not verify the public application. Bot protection remains enabled.";
    console.warn(`::warning::${warning}`);
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `\nPublic HTTPS verification: **BLOCKED**\n\n${warning}\n`,
      );
    return;
  }
  if (response.status !== 200)
    report({ status: "FAIL", httpStatus: response.status, reason: "Unexpected public response" });
  assert.equal(response.status, 200, "Public application must return HTTP 200");
  const file = ".qa/cloudflare-release/web-version";
  const expected =
    process.env.OUTPOST_EXPECTED_VERSION || (existsSync(file) && readFileSync(file, "utf8").trim());
  if (expected) {
    const served = await servedVersion(expected);
    if (served !== expected) {
      report({ status: "FAIL", expectedVersion: expected, servedVersion: served });
      throw new Error(`The edge serves web Worker version ${served}, not the deployed ${expected}`);
    }
  }
  for (const script of ["qa-cloudflare-hosted.mjs", "qa-cloudflare-auth.mjs"]) {
    const result = spawnSync(process.execPath, [`scripts/${script}`], {
      stdio: "inherit",
      env: process.env,
    });
    if (result.status !== 0) {
      report({ status: "FAIL", failedScript: script });
      throw new Error(`Public verification failed: ${script}`);
    }
  }
  report({ status: "PASS", applicationVerifiedFromRunner: true, actualHumanOAuth: "NOT VERIFIED" });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Deployment HTTP verification failed");
    process.exitCode = 1;
  });
}
