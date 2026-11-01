import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Keep the pinned Playwright browser and its sandbox. The browser jobs select
// a supported runner where sandboxed user namespaces work without OS overrides.
const browser = await chromium.launch({ chromiumSandbox: true });
try {
  const page = await browser.newPage();
  await page.goto("data:text/html,<title>Outpost sandbox preflight</title>");
  assert.equal(await page.title(), "Outpost sandbox preflight");
  console.log(
    JSON.stringify({ status: "PASS", chromiumSandbox: true, version: browser.version() }),
  );
} finally {
  await browser.close();
}
