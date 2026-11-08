import { expectResultText } from "./support/result-text";
import { test, expect } from "@playwright/test";
test("changing quality allows a new history request while the old request is pending", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let firstRequested = false;
  await page.route("**/api/history?*", async (route) => {
    const quality = new URL(route.request().url()).searchParams.get("quality");
    if (quality === "1") {
      firstRequested = true;
      await held;
    }
    await route.fulfill({
      json: {
        data: [
          {
            data: [
              {
                timestamp: "2026-10-25T00:00:00",
                avg_price: quality === "1" ? 10000 : 20000,
                item_count: 1,
              },
            ],
          },
        ],
      },
    });
  });
  try {
    // History loads beside the prices, without a click.
    await page.goto("/tools/market?region=europe");
    await expect.poll(() => firstRequested).toBe(true);
    await page.getByLabel("Quality", { exact: true }).selectOption("2");
    await expect(page.locator(".price-chart")).toHaveAttribute(
      "aria-label",
      /minimum 20000, maximum 20000/,
    );
  } finally {
    release!();
  }
});
test("gold chart exposes its actual observation values", async ({ page }) => {
  await page.route("**/api/history?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        region: "europe",
        data: [
          { price: 9000, timestamp: "2026-10-24T00:00:00" },
          { price: 9100, timestamp: "2026-10-25T00:00:00" },
        ],
      }),
    }),
  );
  await page.goto("/tools/gold");
  await expect(page.getByRole("img", { name: /^gold observed price chart/ })).toHaveAttribute(
    "aria-label",
    /minimum 9000, maximum 9100/,
  );
  await page.getByText("View 2 source observations").click();
  await expectResultText(page.locator("tbody"), "9,100");
});
test("named item search preserves selected item and region", async ({ page }) => {
  await page.goto("/items?region=asia");
  await page.getByLabel("Search item name").fill("Battleaxe");
  await page.getByLabel("Tier", { exact: true }).selectOption("6");
  await page.getByLabel("Enchantment", { exact: true }).selectOption("1");
  await expect(page.locator(".item-catalog-row")).toHaveCount(1);
  // The whole row opens the item; its page links to the market with the same id and server.
  await page.locator(".item-catalog-row").getByRole("link").click();
  await page.getByRole("link", { name: "Compare market observations", exact: true }).click();
  await page.getByText("Advanced item identifier", { exact: true }).click();
  await expect(page.getByLabel("Item identifier")).toHaveValue("T6_MAIN_AXE@1");
  await expect(page.getByLabel("Albion region")).toHaveAttribute("data-region", "asia");
});
test("capture desktop and mobile dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
});

test("history dates filter returned observations without inventing missing days", async ({
  page,
}) => {
  await page.route("**/api/history?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            data: [
              { timestamp: "2026-10-01T00:00:00", avg_price: 900, item_count: 2 },
              { timestamp: "2026-10-20T00:00:00", avg_price: 1200, item_count: 3 },
              { timestamp: "2026-10-25T00:00:00", avg_price: 1100, item_count: 4 },
            ],
          },
        ],
      },
    }),
  );
  await page.goto("/tools/market?region=europe");
  await expect(page.locator(".price-chart circle")).toHaveCount(3);
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await expect(page.locator(".price-chart circle")).toHaveCount(2);
  await expect(page.locator(".reference-price-axis")).toContainText("1,200");
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(page.locator(".price-chart circle")).toHaveCount(3);
});
