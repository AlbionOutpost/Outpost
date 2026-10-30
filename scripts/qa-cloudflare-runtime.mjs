#!/usr/bin/env node
// Generate and verify the SQLite/D1 runtime exactly as the deploy does.
// Each command runs in order; a failure is reported as a GitHub annotation that
// names the command and carries its last output lines, then stops the run.
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const state = resolve(".qa/cloudflare-database-test/state");
// Always start from an empty local D1 so a rerun never trips over a previous import.
rmSync(state, { recursive: true, force: true });
mkdirSync(state, { recursive: true });
const d1 = (file) => [
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "CATALOG",
    "--local",
    "--config",
    "cloudflare/database/wrangler.jsonc",
    "--file",
    resolve(file),
    "--persist-to",
    state,
  ],
];
const steps = [
  ["Generate the SQLite Prisma client", "node", ["scripts/cloudflare-database-generate.mjs"]],
  ["Check domain constraints", "node", ["scripts/cloudflare-domain-constraints.mjs", "--check"]],
  ["Type-check the data Worker", "npx", ["tsc", "--project", "cloudflare/tsconfig.json"]],
  ["Verify the D1 schema in SQLite", "python3", ["scripts/qa-d1-schema.py"]],
  ["Stage the item catalog", "node", ["scripts/cloudflare-stage-catalog.mjs", "--write-local"]],
  ["Stage the build library", "node", ["scripts/cloudflare-stage-library.mjs", "--write-local"]],
  ["Import the catalog into local D1", ...d1(".qa/cloudflare-catalog/local-import.sql")],
  ["Import the library into local D1", ...d1(".qa/cloudflare-library/local-import.sql")],
  ["Exercise the data Worker against local D1", "node", ["scripts/qa-cloudflare-database.mjs"]],
];
const ci = !!process.env.GITHUB_ACTIONS;
const escape = (text) => text.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
for (const [title, command, args] of steps) {
  if (ci) console.log(`::group::${title}`);
  const started = Date.now();
  const run = spawnSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  process.stdout.write(output);
  if (ci) console.log("::endgroup::");
  if (run.status !== 0) {
    const tail =
      output.trim().split("\n").slice(-25).join("\n") || String(run.error ?? "no output");
    const message = `${command} ${args.join(" ")} exited ${run.status ?? run.signal}\n${tail}`;
    console.log(
      ci ? `::error title=${title} failed::${escape(message)}` : `FAIL ${title}\n${message}`,
    );
    process.exit(1);
  }
  console.log(`ok ${title} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
