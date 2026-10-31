import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("local item names remain selectable after a successful empty catalog response", async ({
  page,
}) => {
  await page.route("**/api/items?*", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 30 } }),
  );
  await page.goto("/tools/market?region=europe");
  const input = page.getByRole("combobox", { name: "Search market items" });
  const response = page.waitForResponse(
    (r) => r.url().includes("/api/items?") && r.url().includes("Bow"),
  );
  await input.fill("Bow");
  await response;
  await expect(page.getByRole("listbox").getByRole("option").first()).toContainText("Bow");
  await input.press("Enter");
  await expect(page.locator(".market-selection")).toContainText("Bow");
});
test("catalog release persists, filters, paginates and exposes honest provenance", async ({
  page,
}) => {
  const version = `test-${randomUUID()}`;
  const release = await db.catalogRelease.create({
    data: {
      version,
      sourceUrl: "https://example.org/fixture",
      rightsReference: "Original authored test fixture; not live game data",
      checksum: "test",
      itemCount: 1,
    },
  });
  const id = "T4_CATALOG_TEST";
  try {
    await db.itemMetadata.create({
      data: {
        id,
        name: "Original metadata fixture",
        slot: "Main hand",
        tier: 4,
        enchantment: 0,
        abilities: [],
        releaseId: release.id,
      },
    });
    await expect(
      db.itemMetadata.create({
        data: {
          id: "T4_CATALOG_BAD",
          name: "Invalid identity fixture",
          slot: "Main hand",
          tier: 5,
          enchantment: 0,
          abilities: [],
          releaseId: release.id,
        },
      }),
    ).rejects.toThrow();
    await page.goto("/items?region=asia");
    await page
      .getByLabel("Search item name or identifier", { exact: true })
      .fill("Original metadata fixture");
    await page.getByRole("button", { name: "Main hand", exact: true }).click();
    await expect(page.locator(".item-reference-browser tbody tr")).toHaveCount(1);
    await page.getByRole("button", { name: "Cape", exact: true }).click();
    await expect(page.locator(".item-reference-browser tbody tr")).toHaveCount(0);
    await page.getByRole("button", { name: "Main hand", exact: true }).click();
    await expect(page.locator(".item-reference-browser tbody tr")).toContainText(id);
    const r = await page.request.get("/api/items?search=CATALOG_TEST&tier=4&enchantment=0");
    expect(r.status()).toBe(200);
    expect((await r.json()).total).toBe(1);
    expect((await page.request.get("/api/items?tier=9")).status()).toBe(400);
    await page.goto(`/items/${id}?region=asia`);
    await expect(page.getByRole("heading", { name: "Original metadata fixture" })).toBeVisible();
    await expect(page.locator(".workspace-identity p")).toContainText(
      "Base item power not verified",
    );
    await page.reload();
    await expect(page.getByRole("heading", { name: "Abilities", exact: true })).toBeVisible();
    expect((await db.itemMetadata.findUniqueOrThrow({ where: { id } })).releaseId).toBe(release.id);
    await page.getByRole("link", { name: "Compare market observations", exact: true }).click();
    await expect(page.getByLabel("Albion region", { exact: true })).toHaveAttribute(
      "data-region",
      "asia",
    );
    await page.getByText("Advanced item identifier", { exact: true }).click();
    await expect(page.getByLabel("Item identifier", { exact: true })).toHaveValue(id);
  } finally {
    await db.itemMetadata.deleteMany({ where: { releaseId: release.id } });
    await db.catalogRelease.delete({ where: { id: release.id } });
  }
});

test("item detail loads city prices on arrival and links the item's variants", async ({ page }) => {
  await page.route("**/api/market?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        prices: [
          {
            item_id: "T4_MAIN_AXE",
            city: "Lymhurst",
            quality: 1,
            sell_price_min: 2699,
            sell_price_min_date: "2020-01-01T12:00:00",
            sell_price_max: 0,
            sell_price_max_date: "0001-01-01T00:00:00",
            buy_price_min: 0,
            buy_price_min_date: "0001-01-01T00:00:00",
            buy_price_max: 0,
            buy_price_max_date: "0001-01-01T00:00:00",
          },
        ],
      },
    }),
  );
  await page.goto("/items/T4_MAIN_AXE?region=europe");
  const prices = page.getByRole("region", { name: "City price observations" });
  await expect(prices).toContainText("Lymhurst");
  await expect(prices).toContainText("2,699");
  await expect(prices).toContainText("stale");
  await expect(page.locator(".item-price-summary")).toContainText("Lowest sell order");
  await expect(page.locator(".item-price-summary")).toContainText("Unavailable");
  const variants = page.getByRole("region", { name: "Item variants" });
  await expect(variants.locator(".item-variant-link.is-current")).toHaveCount(1);
  await variants.getByRole("link", { name: /^800/ }).first().click();
  await expect(page).toHaveURL(/\/items\/T4_MAIN_AXE@1/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Battleaxe");
});
