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
    await expect(
      page.getByText("Base item power (IP): Not verified", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByText("Item data source & verification", { exact: true }).click();
    await expect(page.getByText(/Release test-/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Imported abilities", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Manual verification: not recorded\. Patch verification: not recorded\./),
    ).toBeVisible();
    await page.getByRole("link", { name: "Compare market observations", exact: true }).click();
    await expect(page.getByLabel("Albion region", { exact: true })).toHaveValue("asia");
    await page.getByText("Advanced item identifier", { exact: true }).click();
    await expect(page.getByLabel("Item identifier", { exact: true })).toHaveValue(id);
  } finally {
    await db.itemMetadata.deleteMany({ where: { releaseId: release.id } });
    await db.catalogRelease.delete({ where: { id: release.id } });
  }
});
