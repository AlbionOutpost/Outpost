#!/usr/bin/env node
// Lab Core Web Vitals for the main pages against a running production build (never `next dev`).
//   node scripts/lighthouse.mjs [--base=http://localhost:3000] [--runs=3] [--out=.qa/lighthouse] [path…]
// Runs Lighthouse (fetched by npx, not a project dependency) at its mobile and desktop presets,
// keeps every report under --out and prints the median of each metric per page and form factor.
// Set CHROME_PATH to use an installed Chromium (e.g. /opt/pw-browsers/chromium).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const flag = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = flag("base", "http://localhost:3000");
const runs = Number(flag("runs", "3"));
const out = flag("out", ".qa/lighthouse");
const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const pages = paths.length
  ? paths
  : [
      "/",
      "/builds",
      "/tools/market",
      "/tools/crafting",
      "/guides/albion-journal-guide",
      "/items",
      "/compositions",
    ];
mkdirSync(out, { recursive: true });
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const rows = [];
for (const path of pages)
  for (const form of ["mobile", "desktop"]) {
    const samples = [];
    for (let run = 1; run <= runs; run++) {
      const file = `${out}/${path.replace(/\W+/g, "_") || "_"}.${form}.${run}.json`;
      try {
        execFileSync(
          "npx",
          [
            "-y",
            "lighthouse@13.6.0",
            base + path,
            ...(form === "desktop" ? ["--preset=desktop"] : []),
            "--only-categories=performance,accessibility",
            "--chrome-flags=--headless=new --no-sandbox",
            "--output=json",
            `--output-path=${file}`,
            "--quiet",
          ],
          { stdio: "ignore" },
        );
      } catch {
        console.error(`failed: ${path} ${form} run ${run}`);
        continue;
      }
      const { audits, categories } = JSON.parse(readFileSync(file, "utf8"));
      const scripts = audits["network-requests"].details.items.filter(
        (r) => r.resourceType === "Script",
      );
      samples.push({
        perf: categories.performance.score * 100,
        a11y: categories.accessibility.score * 100,
        lcp: audits["largest-contentful-paint"].numericValue,
        tbt: audits["total-blocking-time"].numericValue,
        cls: audits["cumulative-layout-shift"].numericValue,
        js: scripts.reduce((sum, r) => sum + r.transferSize, 0) / 1024,
      });
    }
    if (!samples.length) continue;
    const m = (key) => median(samples.map((s) => s[key]));
    rows.push({
      page: path,
      form,
      perf: Math.round(m("perf")),
      a11y: Math.round(m("a11y")),
      "LCP ms": Math.round(m("lcp")),
      "TBT ms": Math.round(m("tbt")),
      CLS: Number(m("cls").toFixed(3)),
      "JS KB": Math.round(m("js")),
      runs: samples.length,
    });
  }
console.table(rows);
