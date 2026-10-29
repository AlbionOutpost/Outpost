import assert from "node:assert/strict";
import { realpathSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

// Ubuntu 24 permits user namespaces for its installed Chrome path, while
// downloaded headless-shell builds are outside that AppArmor profile:
// https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md
// Use the approved installed browser without changing OS policy or file modes.
assert.equal(process.env.OUTPOST_BROWSER_CHANNEL, "chrome", "Use the reviewed CI browser");
const executable = "/opt/google/chrome/chrome";
const metadata = statSync(realpathSync(executable));
assert.equal(metadata.uid, 0, "Installed browser must remain owned by root");
assert.ok(metadata.isFile() && metadata.mode & 0o111, "Installed browser must be executable");
assert.equal(metadata.mode & 0o022, 0, "Installed browser cannot be group/world writable");
const browser = await chromium.launch({ channel: "chrome", chromiumSandbox: true });
try {
  const page = await browser.newPage();
  await page.goto("chrome://sandbox/");
  const status = await page.locator("body").innerText();
  assert.match(status, /Seccomp-BPF sandbox\s+Yes/i, "Seccomp sandbox must be active");
  assert.match(status, /PID namespaces\s+Yes/i, "PID namespace isolation must be active");
  console.log(
    JSON.stringify({
      status: "PASS",
      chromiumSandbox: true,
      channel: "chrome",
      version: browser.version(),
      sandboxStatus: status,
    }),
  );
} finally {
  await browser.close();
}
