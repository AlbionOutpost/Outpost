#!/usr/bin/env node
// Capture Outpost pages at the review viewports.
// Usage: node .claude/skills/outpost-visual-qa/scripts/capture.mjs [--base http://localhost:3000]
//          [--widths 1440,390,320] [--full] [--light] [--reduced-motion] /path [/other ...]
// Writes .qa/screens/<slug>-<width>[-light].png and prints overflow/console findings.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// Prefer the project's Playwright; fall back to a globally installed one.
let chromium;
for (const load of [
  () => import("@playwright/test"),
  () => import("playwright"),
  () => createRequire(`${process.cwd()}/`)("playwright"),
]) {
  try {
    ({ chromium } = await load());
    break;
  } catch {}
}
if (!chromium) throw new Error("Playwright not found: run npm ci (or install playwright).");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = option("--base", "http://localhost:3000").replace(/\/$/, "");
const widths = option("--widths", "1440,390,320").split(",").map(Number);
const heights = { 1920: 1080, 1440: 900, 768: 1024, 390: 844, 375: 812, 320: 640 };
const skip = new Set(["--base", "--widths"].flatMap((f) => [f, option(f)]));
const paths = args.filter((a) => !a.startsWith("--") && !skip.has(a));
if (!paths.length) paths.push("/");

mkdirSync(".qa/screens", { recursive: true });
// PLAYWRIGHT_CHROMIUM_PATH lets you use an already-installed Chromium build.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
for (const path of paths) {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: heights[width] ?? 900 },
      deviceScaleFactor: 1,
      reducedMotion: flag("--reduced-motion") ? "reduce" : "no-preference",
    });
    if (flag("--light")) {
      await context.addCookies([{ name: "atlas-theme", value: "light", url: base }]);
    }
    const page = await context.newPage();
    const problems = [];
    page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    const response = await page.goto(base + path, { waitUntil: "networkidle", timeout: 45000 });
    await page.evaluate(() => document.fonts?.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 0) problems.push(`horizontal overflow ${overflow}px`);
    const slug = path.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home";
    const file = `.qa/screens/${slug}-${width}${flag("--light") ? "-light" : ""}.png`;
    await page.screenshot({ path: file, fullPage: flag("--full") });
    console.log(
      `${file}  status=${response?.status()}${problems.length ? "  ⚠ " + problems.join(" | ") : ""}`,
    );
    await context.close();
  }
}
await browser.close();
