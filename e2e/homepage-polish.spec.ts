import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

// The automatically loaded overview is independent of the manual item-lookup journey.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/market?*view=overview*", (route) =>
    route.fulfill({ json: { region: "europe", prices: [] } }),
  );
  await page.route("**/api/market?*view=pulse*", (route) =>
    route.fulfill({ json: { region: "europe", prices: [] } }),
  );
  await page.route("**/api/history?*", (route) =>
    route.fulfill({ json: { region: "europe", data: [] } }),
  );
});

function quotes(item = "T4_BAG") {
  const recent = new Date(Date.now() - 60000).toISOString();
  return [
    {
      item_id: item,
      city: "Bridgewatch",
      quality: 1,
      sell_price_min: 2400,
      buy_price_max: 0,
      sell_price_min_date: recent,
      buy_price_max_date: "0001-01-01T00:00:00",
    },
    {
      item_id: item,
      city: "Lymhurst",
      quality: 1,
      sell_price_min: 2100,
      buy_price_max: 1800,
      sell_price_min_date: new Date(Date.now() - 7200000).toISOString(),
      buy_price_max_date: "",
    },
    {
      item_id: item,
      city: "Caerleon",
      quality: 1,
      sell_price_min: 2800,
      buy_price_max: 2500,
      sell_price_min_date: new Date(Date.now() + 3600000).toISOString(),
      buy_price_max_date: recent,
    },
  ];
}

test("homepage city preview preserves source prices, per-side dates and loaded accessibility", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/market?*", (route) => {
    if (new URL(route.request().url()).searchParams.has("view")) return route.fallback();
    requests++;
    return route.fulfill({ json: { region: "europe", prices: quotes() } });
  });
  await page.goto("/?region=europe");
  await expect(page.getByRole("button", { name: "Load city prices" })).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Load city prices" }).click();
  const preview = page.getByRole("region", { name: "City price preview", exact: true });
  await expect(preview.locator("tbody tr")).toHaveCount(3);
  const bridgewatch = preview
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "Bridgewatch" }) });
  await expect(bridgewatch).toContainText("2,400");
  await expect(bridgewatch).toContainText("Unavailable");
  const lymhurst = preview
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "Lymhurst" }) });
  await expect(lymhurst).toContainText("Stale");
  await expect(lymhurst).toContainText("Time unknown");
  await expect(preview).toContainText("Time uncertain");
  await expect(preview).toContainText("UTC");
  await expect(page.getByRole("link", { name: /^Open market/ })).toHaveAttribute(
    "href",
    /region=europe&item=T4_BAG/,
  );
  await mkdir(".qa/homepage-polish/after", { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(preview).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page
      .locator(".market-desk")
      .screenshot({ path: `.qa/homepage-polish/after/market-fixture-${width}.png` });
  }
  await page.getByRole("link", { name: /^Open market/ }).click();
  await expect(page).toHaveURL(/tools\/market\?region=europe&item=T4_BAG/);
});

test("homepage preview handles source failures, empty and wrong-identity responses with retry", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/market?*", (route) => {
    if (new URL(route.request().url()).searchParams.has("view")) return route.fallback();
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, json: { error: "fixture outage" } });
    return route.fulfill({
      json: { region: attempts === 3 ? "asia" : "europe", prices: attempts === 2 ? [] : quotes() },
    });
  });
  await page.goto("/?region=europe");
  const load = page.getByRole("button", { name: "Load city prices" });
  await load.click();
  await expect(page.locator(".home-market-status")).toContainText("temporarily unavailable");
  await expect(page.locator(".home-market-table")).toHaveCount(0);
  await load.click();
  await expect(page.locator(".home-market-status")).toContainText("No city observations");
  await load.click();
  await expect(page.locator(".home-market-status")).toContainText("temporarily unavailable");
  await expect(page.locator(".home-market-table")).toHaveCount(0);
  await load.click();
  await expect(page.locator(".home-market-table tbody tr")).toHaveCount(3);
});

test("homepage selections cancel pending work and cannot show another item's or region's prices", async ({
  page,
}) => {
  let held: Route | undefined;
  const requested: string[] = [];
  await page.route("**/api/items?*", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 30 } }),
  );
  await page.route("**/api/market?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("view")) return route.fallback();
    const item = params.get("item")!,
      region = params.get("region")!;
    requested.push(`${region}:${item}`);
    if (item === "T4_BAG") {
      held = route;
      return;
    }
    return route.fulfill({ json: { region, prices: quotes(item) } });
  });
  await page.goto("/?region=europe");
  await page.getByRole("button", { name: "Load city prices" }).click();
  await expect.poll(() => !!held).toBe(true);
  const search = page.getByRole("combobox", { name: "Search market items" });
  await search.fill("T4_2H_BOW");
  await page.getByRole("listbox").getByRole("option").first().click();
  await expect(page.locator(".home-market-table")).toHaveCount(0);
  await page.getByRole("button", { name: "Load city prices" }).click();
  await expect(page.locator(".home-market-table tbody tr")).toHaveCount(3);
  await page.getByLabel("Albion region").selectOption("asia");
  await expect(page.locator(".home-market-table")).toHaveCount(0);
  await page.getByRole("button", { name: "Load city prices" }).click();
  await expect(page.locator(".home-market-table tbody tr")).toHaveCount(3);
  expect(requested).toEqual(["europe:T4_BAG", "europe:T4_2H_BOW", "asia:T4_2H_BOW"]);
  await held!.fulfill({ json: { region: "europe", prices: quotes() } }).catch(() => undefined);
  await expect(page.locator(".home-market-identity")).toContainText("Asia");
  await expect(page.locator(".home-market-table caption")).toContainText("Bow");
  await expect(page.getByRole("link", { name: /^Open market/ })).toHaveAttribute(
    "href",
    /region=asia&item=T4_2H_BOW/,
  );
});

test("homepage quick lookup keeps the selected region and clears previous quotes", async ({
  page,
}) => {
  await page.route("**/api/market?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: { region: params.get("region"), prices: quotes(params.get("item")!) },
    });
  });
  await page.goto("/?region=asia");
  await page.getByRole("button", { name: "Load city prices", exact: true }).click();
  await expect(page.locator(".home-market-table tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Cape", exact: true }).click();
  await expect(page.locator(".home-market-table")).toHaveCount(0);
  await expect(page.locator(".home-market-identity")).toContainText("Cape · T4.0");
  await page.getByRole("button", { name: "Load city prices", exact: true }).click();
  await expect(page.locator(".home-market-table tbody tr")).toHaveCount(3);
  await expect(page.locator(".home-market-open")).toHaveAttribute(
    "href",
    /region=asia&item=T4_CAPE/,
  );
});
