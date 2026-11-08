import { expect, test, type Page } from "@playwright/test";
import { cities } from "../src/lib/albion/region-config";

// Switching item in Market Explorer: both reads go out at once, every panel keeps its size with
// skeletons while they load, the previous item's figures never stand for the new one, and an
// answer seen within the server's cache life comes back without a request.
const priceFor = (item: string) => (item.endsWith("@1") ? 5000 : 1000);

async function stubMarket(page: Page) {
  const gate = { held: false, release: () => {} };
  let opened = Promise.resolve();
  const calls = { market: [] as string[], history: [] as string[] };
  const hold = () => {
    gate.held = true;
    opened = new Promise<void>((resolve) => {
      gate.release = () => {
        gate.held = false;
        resolve();
      };
    });
  };
  await page.route("**/api/market?*", async (route) => {
    const item = new URL(route.request().url()).searchParams.get("item")!;
    calls.market.push(item);
    if (gate.held) await opened;
    await route.fulfill({
      json: {
        region: "europe",
        prices: cities.map((city, i) => ({
          item_id: item,
          quality: 1,
          city,
          sell_price_min: priceFor(item) + i * 100,
          buy_price_max: priceFor(item) - 100 + i * 10,
          sell_price_min_date: "2026-10-25T00:00:00",
          buy_price_max_date: "2026-10-25T00:00:00",
        })),
      },
    });
  });
  await page.route("**/api/history?*", async (route) => {
    const item = new URL(route.request().url()).searchParams.get("item")!;
    calls.history.push(item);
    if (gate.held) await opened;
    await route.fulfill({
      json: {
        data: [
          {
            data: [1, 2, 3].map((day) => ({
              timestamp: `2026-10-2${day}T00:00:00`,
              avg_price: priceFor(item) + day * 10,
              item_count: 5,
            })),
          },
        ],
      },
    });
  });
  return { calls, hold, release: () => gate.release() };
}

// Phones wrap ages to more lines than a stand-in can know, so there the panels hold their last
// height (the inner figures may differ); at 1440 the skeleton figures match the answer exactly.
const panels = [".mx-hero", ".mx-board", ".mx-table-well", ".mx-history"];
const boxes = (page: Page) =>
  page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return [selector, Math.round(r.width), Math.round(r.height), Math.round(r.y)].join(" ");
      }),
    page.viewportSize()!.width >= 1280 ? [...panels, ".mx-figures"] : panels,
  );

for (const width of [1440, 390]) {
  test(`switching version at ${width}px keeps every panel's size and never shows the old figures`, async ({
    page,
  }) => {
    const market = await stubMarket(page);
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto("/tools/market?region=europe");
    await expect(page.locator('.market-board tbody [data-value="1000"]')).toHaveCount(1);
    await expect(page.locator(".price-chart")).toHaveAttribute("aria-label", /minimum 1010/);
    if (width < 1280) await page.getByRole("button", { name: /^Change item/ }).click();
    const version = page.getByRole("button", { name: /^T4\.1,/ });
    await expect(version).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const before = await boxes(page);
    // Every layout shift from here on, including those right after the click.
    await page.evaluate(() => {
      const w = window as unknown as { shift: number };
      w.shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          w.shift += (entry as unknown as { value: number }).value;
      }).observe({ type: "layout-shift" });
    });
    market.hold();
    await version.click();
    // Loading: the new item's identity, skeleton figures, rows and chart; no old price anywhere.
    await expect(page.locator(".mx-hero h2")).toBeVisible();
    await expect(page.locator(".mx-hero .mx-chip.is-tier")).toHaveText("T4.1");
    await expect(page.locator(".mx-figures.is-loading .mx-skel")).toHaveCount(6);
    await expect(page.locator(".market-board tbody tr")).toHaveCount(8);
    await expect(page.locator(".market-board tbody .mx-skel").first()).toBeVisible();
    await expect(page.locator(".history-chart.is-loading")).toBeVisible();
    await expect(page.locator(".mx-hero [data-value], .market-board [data-value]")).toHaveCount(0);
    await expect(
      page.locator(".price-chart[role='img'], .history-chart:not(.is-loading)"),
    ).toHaveCount(0);
    await expect(page.locator(".mx-hero").getByRole("status")).toHaveText("Checking the markets…");
    expect(await boxes(page)).toEqual(before);
    // Both reads went out together: history did not wait for the prices.
    await expect.poll(() => market.calls.history.at(-1)).toBe("T4_BAG@1");
    expect(market.calls.market.at(-1)).toBe("T4_BAG@1");
    market.release();
    await expect(page.locator('.market-board tbody [data-value="5000"]')).toHaveCount(1);
    await expect(page.locator('.mx-hero [data-value="5000"]')).toHaveCount(1);
    await expect(page.locator(".price-chart")).toHaveAttribute("aria-label", /minimum 5010/);
    await expect(page.locator(".mx-skel")).toHaveCount(0);
    expect(await boxes(page)).toEqual(before);
    const shift = await page.evaluate(() => (window as unknown as { shift: number }).shift);
    console.log(`layout shift during the switch at ${width}px: ${shift.toFixed(4)}`);
    expect(shift).toBeLessThan(0.01);
  });
}

test("a version seen within a minute returns at once; Refresh prices asks again", async ({
  page,
}) => {
  const market = await stubMarket(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tools/market?region=europe");
  await expect(page.locator('.market-board tbody [data-value="1000"]')).toHaveCount(1);
  await page.getByRole("button", { name: /^T4\.1,/ }).click();
  await expect(page.locator('.market-board tbody [data-value="5000"]')).toHaveCount(1);
  await expect(page.locator(".price-chart")).toHaveAttribute("aria-label", /minimum 5010/);
  expect(market.calls).toEqual({ market: ["T4_BAG", "T4_BAG@1"], history: ["T4_BAG", "T4_BAG@1"] });
  // Back to the flat bag: its answers are still fresh in this browser, so no request and no wait.
  market.hold();
  await page.getByRole("button", { name: /^T4\.0,/ }).click();
  await expect(page.locator('.market-board tbody [data-value="1000"]')).toHaveCount(1);
  await expect(page.locator(".price-chart")).toHaveAttribute("aria-label", /minimum 1010/);
  expect(market.calls.market).toHaveLength(2);
  expect(market.calls.history).toHaveLength(2);
  market.release();
  // Refresh is a fresh read; the table it already shows stays until the answer lands.
  await page.getByRole("button", { name: "Refresh prices", exact: true }).click();
  await expect.poll(() => market.calls.market.length).toBe(3);
  await expect(page.locator('.market-board tbody [data-value="1000"]')).toHaveCount(1);
});

test("skeletons hold still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const market = await stubMarket(page);
  market.hold();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tools/market?region=europe");
  const skeleton = page.locator(".market-board tbody .mx-skel").first();
  await expect(skeleton).toBeVisible();
  expect(await skeleton.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  market.release();
  await expect(page.locator('.market-board tbody [data-value="1000"]')).toHaveCount(1);
});
