import assert from "node:assert/strict";
import { realpathSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

// Ubuntu 24's AppArmor policy denies user namespaces to downloaded Chromium.
// Chromium documents its installed Chrome SUID helper as a sandbox-preserving option:
// https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md
// CI uses the runner's existing root-owned helper; this script changes no OS policy.
const helper = process.env.CHROME_DEVEL_SANDBOX;
assert.equal(helper, "/opt/google/chrome/chrome-sandbox", "Use the reviewed runner sandbox helper");
const metadata = statSync(realpathSync(helper));
assert.equal(metadata.uid, 0, "Sandbox helper must remain owned by root");
assert.ok(metadata.isFile() && metadata.mode & 0o4000, "Sandbox helper must be a setuid file");
assert.equal(metadata.mode & 0o022, 0, "Sandbox helper cannot be group/world writable");
const browser = await chromium.launch({ chromiumSandbox: true });
try {
  const page = await browser.newPage();
  await page.goto("data:text/html,<title>Outpost sandbox preflight</title>");
  assert.equal(await page.title(), "Outpost sandbox preflight");
  console.log(JSON.stringify({ status: "PASS", chromiumSandbox: true, installedHelper: helper }));
} finally {
  await browser.close();
}
