import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync, writeFileSync, lstatSync } from "node:fs";
import { parseEnv } from "node:util";
const privatePreview = process.argv.includes("--private");
let id, secret;
if (privatePreview) {
  const source = ".env.cloudflare-preview",
    stat = lstatSync(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw new Error("Temporary verification credentials must remain owner-only");
  const values = parseEnv(readFileSync(source, "utf8"));
  id = values.CF_ACCESS_CLIENT_ID;
  secret = values.CF_ACCESS_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Temporary preview verification identity missing");
}
const folder = ".qa/cloudflare-hosted-visual";
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, chromiumSandbox: true });
const context = await browser.newContext();
// Do not use global extraHTTPHeaders: they would send the secret to external artwork/providers.
if (privatePreview)
  await context.route("https://albionoutpost.com/**", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        "CF-Access-Client-Id": id,
        "CF-Access-Client-Secret": secret,
      },
    }),
  );
const page = await context.newPage(),
  results = [],
  errors = [];
page.on("pageerror", (error) => errors.push({ type: "page", message: error.message }));
page.on("console", (message) => {
  if (message.type() === "error")
    errors.push({
      type: "console",
      message: message.text(),
      path: message.location().url ? new URL(message.location().url).pathname : undefined,
    });
});
const viewports = [
  { width: 320, height: 900 },
  { width: 375, height: 900 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
try {
  for (const viewport of viewports)
    for (const path of ["/", "/builds/new", "/builds/library", "/guides", "/signin"]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(`https://albionoutpost.com${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.locator("main h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("main img"))
            .filter((image) => {
              const box = image.getBoundingClientRect();
              return box.top < innerHeight && box.bottom > 0;
            })
            .every((image) => image.complete && image.naturalWidth > 0),
        undefined,
        { timeout: 20000 },
      );
      const screenshot = `${folder}/${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}-${viewport.width}.png`;
      await page.screenshot({ path: screenshot });
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        headingFont: getComputedStyle(document.querySelector("main h1")).fontFamily,
        bodyFont: getComputedStyle(document.body).fontFamily,
      }));
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
        .analyze();
      results.push({
        path,
        ...viewport,
        status: response.status(),
        ...geometry,
        violations: axe.violations.map((row) => ({ id: row.id, impact: row.impact })),
        screenshot,
      });
      console.log(
        JSON.stringify({
          path,
          width: viewport.width,
          status: response.status(),
          overflow: geometry.overflow,
          violations: axe.violations.length,
        }),
      );
      if (response.status() !== 200 || geometry.overflow || axe.violations.length)
        throw new Error("Hosted visual acceptance failed; inspect the captured evidence");
    }
  const manifest = {
    checkedAt: new Date().toISOString(),
    tool: "local-library Playwright/axe fallback; sandboxed Chromium; actual hosted HTTPS",
    state: "Public visitor; anonymous to Discord; owned public library; no provider consent",
    results,
    errors,
    ownerVisualAcceptance: "NOT RECORDED",
    fullAccessibilityConformance: false,
  };
  writeFileSync(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2));
  if (errors.length) throw new Error("Hosted browser reported errors; inspect manifest.json");
} catch (error) {
  writeFileSync(
    `${folder}/manifest.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: "FAIL",
        results,
        errors,
        failure: error instanceof Error ? error.message : "Unknown visual failure",
        actualHumanOAuth: "NOT VERIFIED",
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
