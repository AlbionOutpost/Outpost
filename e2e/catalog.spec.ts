import { expectResultText } from "./support/result-text";
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
    await expect(page.locator(".item-catalog-row")).toHaveCount(1);
    await page.getByRole("button", { name: "Cape", exact: true }).click();
    await expect(page.locator(".item-catalog-row")).toHaveCount(0);
    await page.getByRole("button", { name: "Main hand", exact: true }).click();
    await expect(page.locator(".item-catalog-row")).toContainText(id);
    const r = await page.request.get("/api/items?search=CATALOG_TEST&tier=4&enchantment=0");
    expect(r.status()).toBe(200);
    expect((await r.json()).total).toBe(1);
    expect((await page.request.get("/api/items?tier=9")).status()).toBe(400);
    await page.goto(`/items/${id}?region=asia`);
    await expect(page.getByRole("heading", { name: "Original metadata fixture" })).toBeVisible();
    await expect(page.locator(".workspace-identity p.intro")).toContainText(
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
  // The item page uses Market Explorer's figures and City orders table.
  const prices = page.getByRole("region", { name: "Scrollable market observations" });
  await expect(prices).toContainText("Lymhurst");
  await expectResultText(prices, "2,699");
  await expect(prices).toContainText("Stale");
  await expect(page.locator(".market-quote-summary")).toContainText("Lowest sell order");
  await expect(page.locator(".market-quote-summary")).toContainText("No buy order seen");
  const variants = page.getByRole("region", { name: "Item variants" });
  await expect(variants.locator(".item-variant-link.is-current")).toHaveCount(1);
  await variants.getByRole("link", { name: /^800/ }).first().click();
  await expect(page).toHaveURL(/\/items\/T4_MAIN_AXE@1/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Battleaxe");
});

test("the item database starts at T4 gear and keeps its filters in the address", async ({
  page,
}) => {
  await page.goto("/items");
  // T4 and up first, not T1 beginner tools
  await expect(page.locator(".item-catalog-row").first()).toContainText("T4.0");
  await page.goto("/items?q=claymore");
  const search = page.getByLabel("Search item name or identifier", { exact: true });
  await expect(search).toHaveValue("claymore");
  await expect(page.locator(".item-catalog-row").first()).toContainText(/Claymore|Kingmaker/);
  await page.getByLabel("Tier", { exact: true }).selectOption("6");
  await expect(page).toHaveURL(/[?&]q=claymore/);
  await expect(page).toHaveURL(/[?&]tier=6/);
  await expect(page.locator(".item-catalog-row").first()).toContainText("T6.");
  await page.locator(".item-catalog-row a").first().click();
  await expect(page).toHaveURL(/\/items\/T6_/);
  await page.goBack();
  await expect(search).toHaveValue("claymore");
  await expect(page.getByLabel("Tier", { exact: true })).toHaveValue("6");
  await expect(page.locator(".item-catalog-row").first()).toContainText("T6.");
});

test("grouped catalog search lists each base item once and keeps typed identifiers exact", async ({
  request,
}) => {
  const grouped = await (await request.get("/api/items?search=claymore&group=base")).json();
  const ids: string[] = grouped.items.map((i: { id: string }) => i.id);
  expect(ids).toContain("T4_2H_CLAYMORE");
  expect(ids.filter((id) => id.replace(/^T\d_/, "").replace(/@\d$/, "") === "2H_CLAYMORE")).toEqual(
    ["T4_2H_CLAYMORE"],
  );
  expect(grouped.items.find((i: { id: string }) => i.id === "T4_2H_CLAYMORE")).toMatchObject({
    tiers: [4, 8],
    enchantments: [0, 4],
  });
  const exact = await (await request.get("/api/items?search=T6_2H_CLAYMORE@1&group=base")).json();
  expect(exact.items[0].id).toBe("T6_2H_CLAYMORE@1");
  const variants = await (await request.get("/api/items?variants=T4_2H_CLAYMORE")).json();
  expect(variants.items.map((v: { id: string }) => v.id)).toEqual(
    expect.arrayContaining(["T4_2H_CLAYMORE", "T4_2H_CLAYMORE@4", "T8_2H_CLAYMORE@4"]),
  );
  expect((await request.get("/api/items?variants=../x")).status()).toBe(400);
});

test("Market Explorer search picks the item once, then its tier and enchantment", async ({
  page,
}) => {
  await page.route("**/api/market?*", (route) =>
    route.fulfill({ json: { region: "europe", prices: [] } }),
  );
  await page.goto("/tools/market?region=europe");
  const input = page.getByRole("combobox", { name: "Search market items" });
  await input.fill("claymore");
  const options = page.getByRole("listbox", { name: "Matching market items" }).getByRole("option");
  await expect(options.first()).toContainText("Claymore");
  await expect(options.filter({ hasText: "· .1" })).toHaveCount(0);
  await expect(options.filter({ hasText: "Adept's Claymore" })).toHaveCount(1);
  await options.filter({ hasText: "Adept's Claymore" }).click();
  const variants = page.getByRole("list", { name: "Tier 4 enchantments" });
  await expect(variants.getByRole("button", { pressed: true })).toHaveAccessibleName(/^T4\.0/);
  await variants.getByRole("button", { name: /^T4\.2/ }).click();
  await page.locator(".mx-variants").getByRole("combobox").selectOption("6");
  await page.getByText("Advanced item identifier", { exact: true }).click();
  await expect(page.getByLabel("Item identifier", { exact: true })).toHaveValue("T6_2H_CLAYMORE@2");
  await expect(page).toHaveURL(/item=T6_2H_CLAYMORE%402/);
  // A typed enchanted identifier is still that exact item
  await input.fill("T5_2H_CLAYMORE@3");
  await expect(options.first()).toContainText("T5.3");
  await input.press("Enter");
  await expect(page.getByLabel("Item identifier", { exact: true })).toHaveValue("T5_2H_CLAYMORE@3");
});

test("an item page shows recorded spells from the build library and every build for its weapon", async ({
  page,
}) => {
  await page.goto("/items/T8_2H_CLAYMORE?region=europe");
  const abilities = page.locator(".item-abilities");
  await expect(abilities).not.toContainText("No ability list");
  await expect(abilities).toContainText("archived build library");
  await expect(abilities.getByRole("region", { name: "Q abilities" })).toContainText(
    "Heroic Strike",
  );
  const builds = page.locator(".item-builds");
  const counts = (await builds.textContent())!.match(/([\d,]+) community · ([\d,]+) library/)!;
  const total = Number(counts[1].replace(",", "")) + Number(counts[2].replace(",", ""));
  await expect(builds.getByRole("heading", { level: 2 }).first()).toContainText(`${total}`);
  await expect(
    builds.locator(".build-window, .library-build-card, .community-build-card").first(),
  ).toBeVisible();
  const all = builds.getByRole("link", { name: `See all ${total}` });
  await expect(all).toHaveAttribute("href", /\/builds\?weapon=Claymore/);
  await all.click();
  await expect(page.locator(".ecosystem-results-subline")).toContainText(`${total}`);
});

test("the item database opens on the grid with each item's cheapest current sell order", async ({
  page,
}) => {
  const asked: string[][] = [];
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString().slice(0, 19);
  await page.route("**/api/items/prices?*", (route) => {
    const url = new URL(route.request().url());
    const items = url.searchParams.get("items")!.split(",");
    asked.push(items);
    const order = (item: string, city: string, price: number, minutes: number) => ({
      item,
      city,
      price,
      observedAt: minutesAgo(minutes),
    });
    return route.fulfill({
      json: {
        region: url.searchParams.get("region"),
        quality: 1,
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        orders: [
          // A cheaper stale order never beats a current one.
          order("T4_2H_ARCANESTAFF", "Lymhurst", 900, 300),
          order("T4_2H_ARCANESTAFF", "Martlock", 12_345, 5),
          order("T4_2H_ARCANESTAFF", "Thetford", 15_000, 10),
          // Only a stale order: shown with its age and the stale mark, never as current.
          order("T4_2H_ARCANESTAFF@1", "Bridgewatch", 40_000, 300),
        ].filter((o) => items.includes(o.item)),
      },
    });
  });
  await page.goto("/items?q=Great%20Arcane&tier=4&region=europe");
  await expect(page.locator(".item-catalog-grid")).toBeVisible();
  const card = (id: string) => page.locator(`.item-catalog-row:has(a[href^="/items/${id}?"])`);
  const fresh = card("T4_2H_ARCANESTAFF");
  await expect(fresh.locator('[data-price="fresh"]')).toContainText("12,345");
  await expect(fresh.locator('[data-price="fresh"]')).toContainText("Martlock");
  await expect(fresh.locator('[data-price="fresh"]')).toContainText("5 min ago");
  await expect(fresh).toContainText("T4.0");
  const stale = card("T4_2H_ARCANESTAFF@1");
  await expect(stale.locator('[data-price="stale"]')).toContainText("40,000");
  await expect(stale.locator('[data-price="stale"]')).toContainText("Bridgewatch");
  await expect(stale.locator('[data-price="stale"]')).toContainText("5 h ago");
  await expect(stale.locator('[data-price="stale"]')).toContainText("Stale");
  await expect(card("T4_2H_ARCANESTAFF@2").locator('[data-price="missing"]')).toContainText(
    "No recent price",
  );
  // One request for the whole page, never more than a page of items.
  expect(asked).toHaveLength(1);
  expect(asked[0].length).toBeLessThanOrEqual(30);
  expect(asked[0]).toContain("T4_2H_ARCANESTAFF@1");
});

test("item prices that fail to load say so once and can be retried", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/items/prices?*", (route) => {
    calls++;
    return route.fulfill({ status: 503, json: { error: "Market observations unavailable." } });
  });
  await page.goto("/items?q=Great%20Arcane&tier=4&region=europe");
  await expect(page.getByRole("status").filter({ hasText: "Prices could not load" })).toBeVisible();
  await expect(page.locator('[data-price="missing"]').first()).toContainText("Price unavailable");
  await expect(page.locator('[data-price="fresh"], [data-price="stale"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect.poll(() => calls).toBe(2);
});

test("the item database remembers list or grid, and the address wins", async ({ page }) => {
  await page.route("**/api/items/prices?*", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.goto("/items");
  await expect(page.locator(".item-catalog-grid")).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page).toHaveURL(/[?&]view=list/);
  await page.goto("/items");
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".item-catalog-grid")).toHaveCount(0);
  await page.goto("/items?view=grid");
  await expect(page.locator(".item-catalog-grid")).toBeVisible();
});
