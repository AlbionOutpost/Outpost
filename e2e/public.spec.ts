import { chooseRegion } from "./support/region";
import { test, expect } from "@playwright/test";
test("calculate a trade with real input", async ({ page }) => {
  await page.goto("/tools/flipping");
  await page.getByLabel("Purchase price per item").fill("100");
  await page.getByLabel("Sale price per item").fill("150");
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await expect(page.locator(".result strong")).toContainText("500");
});
test("market failure never substitutes prices", async ({ page }) => {
  await page.route("**/api/market?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Market source unavailable" }),
    }),
  );
  await page.goto("/tools/market");
  await page.getByRole("button", { name: "Compare prices" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("unavailable");
  await expect(page.locator("tbody tr")).toHaveCount(0);
});
test("regional market request and region invalidation", async ({ page }) => {
  await page.route("**/api/market?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        region: "europe",
        prices: [
          {
            item_id: "T4_BAG",
            city: "Lymhurst",
            quality: 1,
            sell_price_min: 100,
            buy_price_max: 90,
            sell_price_min_date: "2020-01-01T00:00:00",
            buy_price_max_date: "2020-01-01T00:00:00",
          },
        ],
      }),
    }),
  );
  await page.goto("/tools/market?region=europe");
  await page.getByRole("button", { name: "Compare prices" }).click();
  await expect(page.locator("tbody")).toContainText("STALE");
  await chooseRegion(page, "asia");
  await expect(page.locator("main")).toContainText("Region changed");
  await expect(page.locator("tbody tr")).toHaveCount(0);
});
test("private account data requires authentication", async ({ request, page }) => {
  expect((await request.get("/api/account/export")).status()).toBe(401);
  await page.goto("/settings");
  await expect(page).toHaveURL(/signin/);
});
test("mobile navigation works without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("link", { name: "Market explorer", exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/market/);
  await expect(page.getByRole("combobox", { name: "Search market items" })).toBeVisible();
});

test("theme and region survive reload, and desktop tool navigation supports Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await chooseRegion(page, "asia");
  await page.locator(".desktop-navigation summary").filter({ hasText: "Tools" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: /^Market explorer City prices/ })
    .click();
  await expect(page.getByLabel("Albion region")).toHaveAttribute("data-region", "asia");
  const tools = page.locator(".desktop-navigation summary").filter({ hasText: "Tools" });
  await tools.click();
  await page.getByRole("link", { name: /^Crafting Materials/ }).focus();
  await page.keyboard.press("Escape");
  await expect(tools).toBeFocused();
  await expect(
    page.locator(".desktop-navigation details").filter({ hasText: "Markets & calculators" }),
  ).not.toHaveAttribute("open");
  const more = page.locator(".more-dropdown > summary");
  await more.click();
  await expect(page.getByRole("link", { name: "My dashboard", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(page.locator(".more-dropdown")).not.toHaveAttribute("open");
});
test("page policy uses per-request nonces and protected data is not publicly cached", async ({
  request,
}) => {
  const a = await request.get("/"),
    b = await request.get("/");
  const ca = a.headers()["content-security-policy"],
    cb = b.headers()["content-security-policy"];
  expect(ca).toContain("strict-dynamic");
  expect(ca).not.toBe(cb);
  expect(ca).toContain("frame-ancestors 'none'");
  if (process.env.E2E_PRODUCTION === "1") expect(ca).not.toContain("unsafe-eval");
  expect(a.headers()["cache-control"]).toContain("no-store");
});
