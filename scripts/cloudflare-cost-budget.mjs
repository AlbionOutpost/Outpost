#!/usr/bin/env node
// Pull-request cost budget for what only a Cloudflare build can show (docs/OPERATIONS.md §
// Cost guardrails): each Worker's gzip bundle stays under its budget in
// scripts/cloudflare-cost-budget.json, and the routes Next prerenders stay prerendered.
// Run after `node scripts/cloudflare-build.mjs` (and the SQLite runtime generation). The cache
// allowlists and Durable Object bindings are checked by tests/cost-budget.test.ts.
import { mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Wrangler's "Total Upload: … / gzip: N KiB" line, in KiB, or null. */
export function gzipKiB(output) {
  const matched = output.match(/gzip:\s*([\d.]+)\s*KiB/);
  return matched ? Number(matched[1]) : null;
}

/** Budget rows: each bundle's size against its budget and the 10 MiB Workers Paid limit. */
export function checkBundles(budget, sizes) {
  return Object.entries(budget.bundles).map(([name, { maxGzipKiB, measuredGzipKiB }]) => {
    const size = sizes[name];
    const ok = size !== null && size !== undefined && size <= maxGzipKiB && size <= 10 * 1024;
    return { name, size, maxGzipKiB, measuredGzipKiB, ok };
  });
}

/** Routes the budget expects prerendered that the build no longer prerenders. */
export function lostStaticRoutes(expected, prerendered) {
  const built = new Set(prerendered);
  return expected.filter((route) => !built.has(route));
}

function main() {
  const budget = JSON.parse(readFileSync("scripts/cloudflare-cost-budget.json", "utf8"));
  const folder = resolve(".qa/cost-budget");
  mkdirSync(folder, { recursive: true });
  const sizes = {};
  for (const [name, { config }] of Object.entries(budget.bundles)) {
    const run = spawnSync(
      process.execPath,
      [
        "node_modules/wrangler/bin/wrangler.js",
        "deploy",
        "--dry-run",
        "--config",
        config,
        "--outdir",
        `${folder}/${name}`,
      ],
      {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: "",
          XDG_CONFIG_HOME: `${folder}/config`,
          WRANGLER_SEND_METRICS: "false",
          WRANGLER_SEND_ERROR_REPORTS: "false",
          CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
        },
      },
    );
    sizes[name] = run.status === 0 ? gzipKiB(`${run.stdout}${run.stderr}`) : null;
    if (sizes[name] === null)
      console.log(
        `${name}: dry run failed\n${`${run.stdout}${run.stderr}`.split("\n").slice(-20).join("\n")}`,
      );
  }
  const rows = checkBundles(budget, sizes);
  for (const row of rows)
    console.log(
      `${row.ok ? "ok  " : "FAIL"} ${row.name}: ${row.size ?? "—"} KiB gzip (budget ${row.maxGzipKiB} KiB, baseline ${row.measuredGzipKiB} KiB)`,
    );
  let prerendered = [];
  try {
    prerendered = Object.keys(
      JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8")).routes,
    );
  } catch {
    console.log("FAIL .next/prerender-manifest.json is missing; run the Cloudflare build first.");
    return 1;
  }
  const lost = lostStaticRoutes(budget.staticRoutes, prerendered);
  console.log(
    lost.length
      ? `FAIL no longer prerendered: ${lost.join(", ")}`
      : `ok   ${budget.staticRoutes.length} static routes still prerendered`,
  );
  const failed = rows.some((row) => !row.ok) || lost.length > 0;
  if (failed)
    console.log(
      `${process.env.GITHUB_ACTIONS ? "::error title=Cost budget::" : ""}A Worker bundle grew past its budget or a static route turned dynamic. Shrink it, or raise the budget in scripts/cloudflare-cost-budget.json with the reason in the PR.`,
    );
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main();
