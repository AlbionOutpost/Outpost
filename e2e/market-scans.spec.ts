import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { gameRecipe } from "../src/lib/albion/game/recipes";
import { createTestDb } from "./support/db";
import { expectResultText } from "./support/result-text";

/**
 * Black Market board, Profitable crafts and the watchlist's "since your last visit", with every
 * price answered by fixtures (the sandbox and CI never reach the Albion Online Data Project).
 */
const db = createTestDb();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString().slice(0, 19);
const fresh = minutesAgo(10),
  old = minutesAgo(180);
const obs = (
  item_id: string,
  city: string,
  quality: number,
  sell: number,
  buy = 0,
  sellDate = fresh,
  buyDate = fresh,
) => ({
  item_id,
  city,
  quality,
  sell_price_min: sell,
  sell_price_min_date: sellDate,
  buy_price_max: buy,
  buy_price_max_date: buyDate,
});
const shots = process.env.QA_SHOTS;
async function capture(page: Page, name: string) {
  if (!shots) return;
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
    [320, 700],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/${name}-${w}.png`, fullPage: w !== 1440 });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
async function contentBottom(page: Page) {
  return page.evaluate(() => {
    scrollTo(0, 0);
    const main = document.querySelector("main")!;
    return Math.max(...[...main.children].map((el) => el.getBoundingClientRect().bottom));
  });
}
async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`);
}
async function noPageOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
}

test("Black Market board nets the buy order after tax, marks missing and stale orders", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/economy/black-market?**", (route) => {
    requests++;
    const q = new URL(route.request().url()).searchParams;
    expect(Object.fromEntries(q)).toMatchObject({
      region: "europe",
      category: "sword",
      fromTier: "4",
      toTier: "8",
      enchantment: "0",
      quality: "1",
    });
    return route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Data Project",
        fetchedAt: new Date().toISOString(),
        quality: 1,
        total: 3,
        items: [
          { id: "T6_2H_DUALSWORD", name: "Dual Swords · T6.0", tier: 6 },
          { id: "T6_2H_CLAYMORE", name: "Claymore · T6.0", tier: 6 },
          { id: "T6_MAIN_SWORD", name: "Broadsword · T6.0", tier: 6 },
        ],
        prices: [
          obs("T6_MAIN_SWORD", "Lymhurst", 1, 1200, 900),
          obs("T6_MAIN_SWORD", "Martlock", 1, 1000, 800),
          obs("T6_MAIN_SWORD", "Black Market", 1, 400, 1500),
          obs("T6_2H_CLAYMORE", "Thetford", 1, 1000, 0, old),
          obs("T6_2H_CLAYMORE", "Black Market", 1, 0, 900),
          obs("T6_2H_DUALSWORD", "Lymhurst", 1, 2000),
        ],
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tools/black-market?region=europe");
  await expect(page.getByRole("heading", { name: "Black Market board", level: 1 })).toBeVisible();
  const rows = page.getByRole("region", { name: "Black Market board" }).locator("li");
  await expect(rows).toHaveCount(3);
  // Best net first: 1,500 × 0.96 − 1,000 = 440 from Martlock; then the 900 offer at a loss.
  await expect(rows.nth(0)).toContainText("Broadsword · T6.0");
  await expect(rows.nth(0)).toContainText("Martlock");
  await expectResultText(rows.nth(0).locator("[class*=flipNet]"), /440/);
  await expect(rows.nth(0)).toContainText("29.3%");
  await expect(rows.nth(1)).toContainText("Includes old prices");
  await expect(rows.nth(1)).toContainText("Stale");
  await expectResultText(rows.nth(1).locator("[class*=flipNet]"), /−?-?136/);
  // No Black Market order: listed last, unavailable, never zero.
  await expect(rows.nth(2)).toContainText("No Black Market buy order");
  await expect(rows.nth(2).locator("[class*=flipNet]")).toContainText("Unavailable");
  await expect(
    page.getByText(/1 of 3 items pay more at the Black Market after 4% tax/),
  ).toBeVisible();
  // The item opens Market Explorer; the haul opens the transport planner to the Black Market.
  await expect(
    rows.nth(0).getByRole("link", { name: "Broadsword · T6.0", exact: true }),
  ).toHaveAttribute("href", "/tools/market?region=europe&item=T6_MAIN_SWORD&quality=1");
  await expect(
    rows.nth(0).getByRole("link", { name: "Plan haul for Broadsword · T6.0" }),
  ).toHaveAttribute(
    "href",
    "/tools/transporting?region=europe&item=T6_MAIN_SWORD&from=Martlock&to=Black+Market&quality=1",
  );
  // Without premium the tax is 8 %: 1,500 × 0.92 − 1,000 = 380, with no new price request.
  await page.getByRole("button", { name: "No premium 8%", exact: true }).click();
  await expectResultText(rows.nth(0).locator("[class*=flipNet]"), /380/);
  await expect(page.getByLabel("Sales tax (%)")).toHaveValue("8");
  expect(requests).toBe(1);
  expect(await contentBottom(page)).toBeLessThanOrEqual(900);
  expect(await axe(page)).toEqual([]);
  await capture(page, "black-market");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await noPageOverflow(page), `no sideways scroll at ${width}`).toBe(true);
  }
});

test("Black Market board says when prices fail and when a range has no gear", async ({ page }) => {
  let fail = true;
  await page.route("**/api/economy/black-market?**", (route) =>
    fail
      ? route.fulfill({ status: 503, json: { error: "Upstream unavailable" } })
      : route.fulfill({
          json: { region: "europe", quality: 1, total: 0, items: [], prices: [] },
        }),
  );
  await page.goto("/tools/black-market?region=europe");
  await expect(page.getByText("Prices couldn’t be loaded. Your inputs were kept.")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No gear in this range", { exact: true })).toBeVisible();
});

const sword = gameRecipe("T6_MAIN_SWORD")!,
  claymore = gameRecipe("T6_2H_CLAYMORE")!,
  scimitar = gameRecipe("T6_MAIN_SCIMITAR_MORGANA")!;
const craftPrices = [
  obs("T6_METALBAR", "Lymhurst", 1, 100),
  obs("T6_LEATHER", "Lymhurst", 1, 50, 0, old),
  obs("T6_MAIN_SWORD", "Lymhurst", 1, 3000),
  obs("T6_2H_CLAYMORE", "Lymhurst", 1, 3500),
  obs("T6_MAIN_SCIMITAR_MORGANA", "Lymhurst", 1, 9000),
];

test("Profitable crafts ranks recipes with the calculator's engine and opens one with the same settings", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/economy/crafts?**", (route) => {
    requests++;
    return route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Data Project",
        quality: 1,
        candidates: 3,
        recipes: [sword, claymore, scimitar],
        prices: craftPrices,
      },
    });
  });
  await page.route("**/api/economy/prices?**", (route) => route.fulfill({ json: { prices: {} } }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tools/profitable-crafts?region=europe");
  await expect(page.getByRole("heading", { name: "Profitable crafts", level: 1 })).toBeVisible();
  const rows = page.getByRole("region", { name: "Ranked crafts" }).locator("li");
  await expect(rows).toHaveCount(3);
  // Lymhurst returns 33/133 on swords; 4 % tax and 2.5 % setup on the listing.
  // Claymore: 3,500 − 227.5 − 2,600 × 100/133 = 1,317.61; Broadsword: 3,000 − 195 − 2,000 ×
  // 100/133 = 1,301.24. Per craft the claymore leads.
  await expect(rows.nth(0)).toContainText("Claymore");
  await expectResultText(rows.nth(0).locator("[class*=flipNet]"), /1,317\.6/);
  await expectResultText(rows.nth(1).locator("[class*=flipNet]"), /1,301\.2/);
  // The leather observation is three hours old: the row says so.
  await expect(rows.nth(0)).toContainText("Stale");
  await expect(rows.nth(2)).toContainText("No price for");
  await expect(rows.nth(2).locator("[class*=flipNet]")).toContainText("Unavailable");
  // A 5,000 budget buys two broadswords (2,602.48) but one claymore (1,317.61).
  await page.getByLabel("Budget (silver)").fill("5000");
  await expect(rows.nth(0)).toContainText("Broadsword");
  await expectResultText(rows.nth(0).locator("[class*=flipNet]"), /2,602\.4/);
  await expect(rows.nth(0)).toContainText("2 ×");
  expect(requests).toBe(1);
  expect(await contentBottom(page)).toBeLessThanOrEqual(900);
  expect(await axe(page)).toEqual([]);
  await capture(page, "profitable-crafts");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await noPageOverflow(page), `no sideways scroll at ${width}`).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const open = rows
    .nth(0)
    .getByRole("link", { name: "Open Master's Broadsword in the calculator" });
  const href = (await open.getAttribute("href"))!;
  expect(href).toMatch(/^\/tools\/crafting\?/);
  expect(Object.fromEntries(new URL(href, "http://x").searchParams)).toMatchObject({
    recipe: "T6_MAIN_SWORD",
    buy: "Lymhurst",
    sell: "Lymhurst",
    craft: "Lymhurst",
    tax: "4",
    setup: "2.5",
    returns: "T6_METALBAR,T6_LEATHER",
  });
  await open.click();
  await expect(page).toHaveURL(/\/tools\/crafting\?/);
  await expect(page.getByRole("heading", { name: /Broadsword/ }).first()).toBeVisible();
  await expect(page.getByLabel("Material purchase market")).toHaveValue("Lymhurst");
  await expect(page.getByLabel("Output sale market")).toHaveValue("Lymhurst");
  await expect(page.getByLabel("Return rate without focus (%)")).toHaveValue(/24\.81/);
});

test("Profitable crafts keeps settings when prices fail and flags a bad budget", async ({
  page,
}) => {
  await page.route("**/api/economy/crafts?**", (route) =>
    route.fulfill({ status: 503, json: { error: "Upstream unavailable" } }),
  );
  await page.goto("/tools/profitable-crafts?region=europe");
  await expect(page.getByText("Prices couldn’t be loaded. Your inputs were kept.")).toBeVisible();
  await page.unroute("**/api/economy/crafts?**");
  await page.route("**/api/economy/crafts?**", (route) =>
    route.fulfill({
      json: { region: "europe", quality: 1, candidates: 1, recipes: [sword], prices: [] },
    }),
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  // Nothing observed: the craft is listed as unpriced, never ranked at zero.
  const rows = page.getByRole("region", { name: "Ranked crafts" }).locator("li");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("No price for");
  await expect(page.getByText(/0 of 1 craft makes silver per craft/)).toBeVisible();
});

test("the watchlist shows what changed since the last visit and marks it as seen", async ({
  page,
  context,
}) => {
  const user = { id: `atlas-test-${randomUUID()}`, token: randomUUID() };
  await db.user.create({
    data: {
      id: user.id,
      sessions: { create: { sessionToken: user.token, expires: new Date(Date.now() + 600000) } },
      marketWatchItems: {
        create: [
          { region: "europe", itemId: "T4_BAG", quality: 1 },
          { region: "europe", itemId: "T4_CAPE", quality: 1 },
        ],
      },
    },
  });
  try {
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: user.token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    let bag = 1000;
    await page.route("**/api/market/batch?*", (route) =>
      route.fulfill({
        json: {
          region: "europe",
          fetchedAt: new Date().toISOString(),
          source: "Albion Online Data Project",
          prices: [obs("T4_BAG", "Lymhurst", 1, bag, 800), obs("T4_CAPE", "Martlock", 1, 0, 500)],
        },
      }),
    );
    const open = async () => {
      await page.goto("/tools/market?region=europe&item=T4_BAG&quality=1");
      await page.getByRole("tab", { name: "Research & watchlist", exact: true }).click();
      await page.getByRole("tab", { name: "Watchlist", exact: true }).click();
      await page.getByRole("button", { name: "Load your watchlist", exact: true }).click();
      await page.getByRole("button", { name: "Refresh watchlist quotes", exact: true }).click();
    };
    await open();
    const list = page.locator(".market-watchlist:not(.market-research-list)");
    await expect(list.getByText(/mark them as seen to track changes/)).toBeVisible();
    await expect(list.getByText("New on your watchlist since your last visit")).toHaveCount(2);
    await list.getByRole("button", { name: "Mark as seen", exact: true }).click();
    await expect(list.getByRole("status")).toContainText("Marked as seen on this device");
    // Next visit: the bag's lowest sell order rose from 1,000 to 1,125 (+12.5 %).
    bag = 1125;
    await open();
    await expect(list.getByText(/marked as seen just now, on this device/)).toBeVisible();
    const bagRow = list.locator(".watchlist-items > li").filter({ hasText: "Bag" });
    await expect(bagRow).toContainText("Up 12.5%");
    await expect(bagRow).toContainText("was 1,000 · Lymhurst");
    await expect(bagRow).toContainText("Buy order Unchanged");
    // The cape never had a sell order: no data now is not a fall to zero.
    const capeRow = list.locator(".watchlist-items > li").filter({ hasText: "Cape" });
    await expect(capeRow).toContainText("No order now");
    await expect(capeRow).not.toContainText("Down");
    if (shots) await page.screenshot({ path: `${shots}/watchlist-1440.png` });
    await list.getByRole("button", { name: "Mark as seen", exact: true }).click();
    await open();
    await expect(bagRow).toContainText("Sell order Unchanged");
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
