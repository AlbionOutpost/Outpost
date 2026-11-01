import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  // The suite shares local services and public request budgets across browsers.
  workers: process.env.CI ? 1 : 2,
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: {
      chromiumSandbox: true,
      // Optional: reuse an already-installed Chromium instead of Playwright's download.
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : {}),
    },
  },
  webServer: {
    command:
      process.env.E2E_CLOUDFLARE === "1"
        ? "node scripts/cloudflare-local-server.mjs"
        : process.env.E2E_PRODUCTION === "1"
          ? "npm start"
          : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});
