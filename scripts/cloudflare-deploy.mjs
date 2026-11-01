#!/usr/bin/env node
// Free-bundle check, then deploy the data Worker and the web Worker.
// A failure is reported as a GitHub annotation with the command and its last output lines
// (API token redacted), because job logs are not always readable where the deploy is reviewed.
import { spawnSync } from "node:child_process";

const secret = process.env.CLOUDFLARE_API_TOKEN;
const ci = !!process.env.GITHUB_ACTIONS;
const escape = (text) => text.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
const redact = (text) => (secret ? text.replaceAll(secret, "[redacted]") : text);
const steps = [
  ["Check Free bundle limits", ["scripts/cloudflare-free-check.mjs"]],
  [
    "Deploy the data Worker",
    [
      "node_modules/wrangler/bin/wrangler.js",
      "deploy",
      "--config",
      ".qa/cloudflare-release/data.jsonc",
    ],
  ],
  [
    "Deploy the web Worker",
    [
      "node_modules/wrangler/bin/wrangler.js",
      "deploy",
      "--config",
      ".qa/cloudflare-release/web.jsonc",
    ],
  ],
];
for (const [title, args] of steps) {
  const run = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const output = redact(`${run.stdout ?? ""}${run.stderr ?? ""}`);
  process.stdout.write(output);
  if (run.status !== 0) {
    const tail =
      output.trim().split("\n").slice(-30).join("\n") || String(run.error ?? "no output");
    console.log(ci ? `::error title=${title} failed::${escape(tail)}` : `FAIL ${title}\n${tail}`);
    process.exit(1);
  }
  console.log(`ok ${title}`);
}
