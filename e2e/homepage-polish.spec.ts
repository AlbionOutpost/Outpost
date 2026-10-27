import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const stamp = new Date(Date.now() - 60000).toISOString();
function quotes(item = "T4_BAG") {
  return [
    {
      item_id: item,
      quality: 1,
      city: "Bridgewatch",
      sell_price_min: 2400,
      buy_price_max: 0,
      sell_price_min_date: stamp,
      buy_price_max_date: "0001-01-01T00:00:00",
    },
    {
      item_id: item,
      quality: 1,
      city: "Lymhurst",
      sell_price_min: 2100,
      buy_price_max: 1800,
      sell_price_min_date: new Date(Date.now() - 7200000).toISOString(),
      buy_price_max_date: "",
    },
  ];
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/history?*", (r) => r.fulfill({ json: { region: "europe", data: [] } }));
});
test("the single homepage preview preserves exact quotes and independent source dates", async ({
  page,
}) => {
  await page.route("**/api/market?*", (r) =>
    r.fulfill({ json: { region: "europe", prices: quotes() } }),
  );
  await page.goto("/?region=europe");
  const prices = page.locator(".terminal-city-prices");
  await expect(prices).toContainText("2,400");
  await expect(prices).toContainText("Unavailable");
  await expect(prices).toContainText("Stale");
  await expect(prices).toContainText("Time unknown");
  await page.locator(".terminal-source summary").click();
  await expect(page.locator(".terminal-quote-times")).toContainText(
    stamp.replace("T", " ").replace(".000Z", " UTC"),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("preview distinguishes source failure and missing observations, then supports retry", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/market?*", (r) => {
    count++;
    return count === 1
      ? r.fulfill({ status: 503, json: { error: "outage" } })
      : r.fulfill({ json: { region: "europe", prices: count === 2 ? [] : quotes() } });
  });
  await page.goto("/?region=europe");
  await expect(page.locator(".terminal-city-prices")).toContainText(
    "City prices could not be loaded",
  );
  await page.locator(".terminal-source summary").click();
  await page.getByRole("button", { name: "Refresh observations", exact: true }).click();
  await expect.poll(() => count).toBe(2);
  await expect(page.locator(".terminal-city-prices")).toContainText("No city quotes were returned");
  await page.getByRole("button", { name: "Refresh observations", exact: true }).click();
  await expect(page.locator(".terminal-city-prices")).toContainText("2,400");
});
test("selecting an item cancels the previous identity and preserves region in the market link", async ({
  page,
}) => {
  await page.route("**/api/items?*", (r) =>
    r.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 30 } }),
  );
  await page.route("**/api/market?*", (r) => {
    const q = new URL(r.request().url()).searchParams;
    return r.fulfill({ json: { region: q.get("region"), prices: quotes(q.get("item")!) } });
  });
  await page.goto("/?region=europe");
  const search = page.getByRole("combobox", { name: "Search market items", exact: true });
  await search.fill("Cape");
  await page.getByRole("option").filter({ hasText: "Cape" }).first().click();
  await expect(page.locator(".terminal-item h2")).toContainText("Cape");
  await expect(page.getByRole("link", { name: "Explore market", exact: true })).toHaveAttribute(
    "href",
    /item=T4_CAPE/,
  );
  await page.getByLabel("Albion region", { exact: true }).selectOption("asia");
  await expect(page.getByRole("link", { name: "Explore market", exact: true })).toHaveAttribute(
    "href",
    /region=asia.*item=T4_CAPE/,
  );
});
