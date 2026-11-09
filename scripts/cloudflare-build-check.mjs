#!/usr/bin/env node
// Checks the OpenNext output the deploy uploads: crawler files are static assets (served without
// running the Worker) and no Next route still answers them. Run by cloudflare-build.mjs.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const assets = ".open-next/assets";
const robots = readFileSync(`${assets}/robots.txt`, "utf8");
for (const line of ["User-agent: AhrefsBot", "Disallow: /*?q=", "Sitemap: "])
  assert.ok(robots.includes(line), `${assets}/robots.txt lacks "${line}"`);
JSON.parse(readFileSync(`${assets}/manifest.webmanifest`, "utf8"));
assert.ok(existsSync(`${assets}/sitemap.xml`), `${assets}/sitemap.xml is missing`);
const routes = Object.keys(
  JSON.parse(
    readFileSync(
      ".open-next/server-functions/default/.next/server/app-paths-manifest.json",
      "utf8",
    ),
  ),
);
const shadowing = routes.filter((route) =>
  /^\/(robots\.txt|manifest\.webmanifest|sitemap\.xml)\//.test(route),
);
assert.deepEqual(shadowing, [], "A Next route would answer a file that must stay static");
console.log("Build check: robots.txt, manifest and sitemap are static assets.");
