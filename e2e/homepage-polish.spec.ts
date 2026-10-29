import { chooseRegion } from "./support/region";
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
  let stage: "error" | "missing" | "observed" = "error";
  await page.route("**/api/market?*", (r) =>
    stage === "error"
      ? r.fulfill({ status: 503, json: { error: "outage" } })
      : r.fulfill({ json: { region: "europe", prices: stage === "missing" ? [] : quotes() } }),
  );
  await page.goto("/?region=europe");
  await expect(page.locator(".terminal-city-prices")).toContainText(
    "City prices could not be loaded",
  );
  await page.locator(".terminal-source summary").click();
  stage = "missing";
  await page.getByRole("button", { name: "Refresh observations", exact: true }).click();
  await expect(page.locator(".terminal-city-prices")).toContainText("No city quotes were returned");
  stage = "observed";
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
  await chooseRegion(page, "asia");
  await expect(page.getByRole("link", { name: "Explore market", exact: true })).toHaveAttribute(
    "href",
    /region=asia.*item=T4_CAPE/,
  );
});

test("homepage has one observed-price workspace with optional history and one request per item", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/market?*", (route) => {
    requests++;
    const query = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: { region: query.get("region"), prices: quotes(query.get("item")!) },
    });
  });
  await page.route("**/api/items?*", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 30 } }),
  );
  await page.goto("/?region=europe");
  await expect(page.locator(".home-terminal")).toHaveCount(1);
  await expect(page.locator(".hero-market-workspace")).toHaveCount(0);
  await expect(page.locator(".terminal-city-prices")).toContainText("2,400");
  expect(requests).toBe(1);
  await page.getByRole("combobox", { name: "Search market items", exact: true }).fill("Cape");
  await page.getByRole("option").filter({ hasText: "Cape" }).first().click();
  await expect(page.locator(".terminal-item h2")).toContainText("Cape");
  await expect.poll(() => requests).toBe(2);
  await page.locator(".terminal-source summary").click();
  await expect(page.getByRole("combobox", { name: "History city", exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "History city", exact: true })
    .selectOption("Bridgewatch");
  expect(requests).toBe(2);
});

test("homepage quick selection shares the search identity and retains regional quotes", async ({
  page,
}) => {
  const identities: string[] = [];
  await page.route("**/api/market?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    identities.push(`${query.get("region")}:${query.get("item")}`);
    return route.fulfill({
      json: { region: query.get("region"), prices: quotes(query.get("item")!) },
    });
  });
  await page.goto("/?region=europe");
  const shortcuts = page.getByRole("group", { name: "Quick item selection" });
  await expect(page.locator(".terminal-city-prices")).toContainText("2,400");
  await shortcuts.getByRole("button", { name: "Cape", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(shortcuts.getByRole("button", { name: "Cape", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(shortcuts.getByRole("button", { name: "Bag", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator(".terminal-item h2")).toContainText("Cape");
  await expect(page.getByRole("link", { name: "Explore market", exact: true })).toHaveAttribute(
    "href",
    /region=europe&item=T4_CAPE/,
  );
  await expect.poll(() => identities).toEqual(["europe:T4_BAG", "europe:T4_CAPE"]);
  await shortcuts.getByRole("button", { name: "Cape", exact: true }).click();
  await expect.poll(() => identities.length).toBe(2);
});
