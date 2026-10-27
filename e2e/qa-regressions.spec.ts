import { test, expect } from "@playwright/test";
test("preference cookie and market request agree without a region URL", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "atlas-region", value: "asia", domain: "localhost", path: "/" },
  ]);
  let requested = "";
  await page.route("**/api/market?**", async (route) => {
    requested = new URL(route.request().url()).searchParams.get("region") || "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ region: requested, prices: [] }),
    });
  });
  await page.goto("/tools/market");
  await expect(page.getByLabel("Albion region")).toHaveValue("asia");
  await page.getByRole("button", { name: "Compare prices" }).click();
  await expect.poll(() => requested).toBe("asia");
});
test("changing quality or item invalidates previously loaded prices", async ({ page }) => {
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
            sell_price_min_date: "2026-10-25T18:00:00",
            buy_price_max_date: "2026-10-25T18:00:00",
          },
        ],
      }),
    }),
  );
  await page.goto("/tools/market?region=europe");
  await page.getByRole("button", { name: "Compare prices" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="5"]') })
    .first()
    .selectOption("2");
  await expect(page.locator("tbody tr")).toHaveCount(0);
});

test("market sort and city filtering retain correct buy and sell columns", async ({ page }) => {
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
            sell_price_min: 200,
            buy_price_max: 150,
            sell_price_min_date: "2026-10-25T00:00:00",
            buy_price_max_date: "2026-10-25T00:00:00",
          },
          {
            item_id: "T4_BAG",
            city: "Caerleon",
            quality: 1,
            sell_price_min: 100,
            buy_price_max: 50,
            sell_price_min_date: "2026-10-25T00:00:00",
            buy_price_max_date: "2026-10-25T00:00:00",
          },
        ],
      }),
    }),
  );
  await page.goto("/tools/market?region=europe");
  await page.getByRole("button", { name: "Compare prices" }).click();
  await page.getByLabel("Sort market prices").selectOption("buy");
  await expect(page.locator("tbody tr").first()).toContainText("Lymhurst");
  await page.getByLabel("Market city", { exact: true }).selectOption("Caerleon");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr td.numeric > span").nth(0)).toHaveText("100");
  await expect(page.locator("tbody tr td.numeric > span").nth(1)).toHaveText("50");
  await expect(page.locator("tbody tr td.numeric .market-inline-time").first()).toContainText(
    "10-25 00:00",
  );
});
test("decimal profit is visible and clearing numeric inputs causes no React warnings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/tools/flipping");
  await page.getByLabel("Purchase price per item").fill("1");
  await page.getByLabel("Sale price per item").fill("1.5");
  await expect(page.locator(".result strong")).toContainText("0.5");
  await page.getByLabel("Purchase price per item").fill("");
  await expect(page.locator("p[role=alert]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("visitor journey from named item search to a verified trade result", async ({ page }) => {
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
            sell_price_min_date: "2026-10-25T00:00:00",
            buy_price_max_date: "2026-10-25T00:00:00",
          },
          {
            item_id: "T4_BAG",
            city: "Caerleon",
            quality: 1,
            sell_price_min: 110,
            buy_price_max: 80,
            sell_price_min_date: "2026-10-25T00:00:00",
            buy_price_max_date: "2026-10-25T00:00:00",
          },
        ],
      }),
    }),
  );
  await page.goto("/");
  await page.getByLabel("Albion region").selectOption("europe");
  await page.locator(".desktop-navigation summary").click();
  await page.getByRole("link", { name: /^Item reference Gear/ }).click();
  await page.getByLabel("Search item name").fill("Bag");
  await page.getByLabel("Tier", { exact: true }).selectOption("4");
  await page.getByLabel("Enchantment", { exact: true }).selectOption("0");
  await page
    .locator('.item-reference-browser tbody a[href="/tools/market?region=europe&item=T4_BAG"]')
    .click();
  await page.getByRole("button", { name: "Compare prices" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.locator(".desktop-navigation summary").click();
  await page.getByRole("link", { name: /^Profit calculator Fees/ }).click();
  await page.getByLabel("Purchase price per item").fill("100");
  await page.getByLabel("Sale price per item").fill("150");
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await expect(page.locator(".result strong")).toContainText("500");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Market explorer" })).toBeVisible();
});
