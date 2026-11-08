import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cities } from "../src/lib/albion/region-config";

const innerHeightFor = (width: number) => (width === 1440 ? 900 : 1080);
test("market source fixtures retain table, chart and filtering at review widths", async ({
  page,
}) => {
  // Screenshots land in .qa/<area>-correction/current for review.
  const iteration: string = "current";
  const folder = `.qa/market-correction/${iteration}`;
  await mkdir(folder, { recursive: true });
  await page.route("**/api/market?*", (route) => {
    const quality = Number(new URL(route.request().url()).searchParams.get("quality"));
    return route.fulfill({
      json: {
        region: "europe",
        prices: cities.map((city, i) => ({
          item_id: "T4_BAG",
          quality,
          city,
          sell_price_min: i === 7 ? 0 : 1200 + i * 100,
          buy_price_max: 1000 + i * 100,
          sell_price_min_date: "2026-10-25T00:00:00",
          buy_price_max_date: "2026-10-25T00:00:00",
        })),
      },
    });
  });
  await page.route("**/api/history?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            data: [
              { timestamp: "2026-10-20T00:00:00", avg_price: 1000, item_count: 10 },
              { timestamp: "2026-10-21T00:00:00", avg_price: 1250, item_count: 12 },
              { timestamp: "2026-10-22T00:00:00", avg_price: 1100, item_count: 8 },
            ],
          },
        ],
      },
    }),
  );
  const measures = [];
  for (const width of [1440, 1920, 768, 390, 375, 320]) {
    await page.setViewportSize({
      width,
      height: width === 1440 ? 900 : width === 1920 ? 1080 : width === 768 ? 1024 : 844,
    });
    await page.goto("/tools/market?region=europe");
    await expect(page.locator(".market-board tbody tr")).toHaveCount(8);
    await expect(page.locator(".price-chart")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const note = document.createElement("div");
      note.textContent = "VISUAL QA FIXTURE · prices are not live";
      note.setAttribute("aria-hidden", "true");
      note.style.cssText =
        "position:fixed;bottom:4px;right:4px;font:11px sans-serif;background:#101014;color:#f2eee9;padding:4px;z-index:999;pointer-events:none";
      document.body.append(note);
      scrollTo(0, 0);
    });
    await page.screenshot({ path: `${folder}/market-${width}.png`, fullPage: true });
    await page.screenshot({ path: `${folder}/viewport-${width}.png`, fullPage: false });
    const measured = await page.evaluate((width) => {
      const r = document.querySelector(".market-board .table-scroll")!.getBoundingClientRect();
      return {
        width,
        tableY: r.y,
        tableWidth: r.width,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    }, width);
    measures.push(measured);
    expect(measured.overflow).toBe(false);
    const observations = page.locator(".market-board .table-scroll");
    expect(await observations.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    if (width >= 1440) {
      // One screen: search, item, all eight cities and the history fit the first viewport, and
      // the eight rows fit without scrolling their own well.
      const fit = await page.evaluate(() => ({
        workspace: document.querySelector(".mx")!.getBoundingClientRect().bottom,
        history: document.querySelector(".mx-history")!.getBoundingClientRect().bottom,
        tableOverflow: (() => {
          const well = document.querySelector(".market-board .table-scroll")!;
          return well.scrollHeight - well.clientHeight;
        })(),
      }));
      expect(fit.workspace).toBeLessThanOrEqual(innerHeightFor(width));
      expect(fit.history).toBeLessThanOrEqual(innerHeightFor(width));
      expect(fit.tableOverflow).toBeLessThanOrEqual(1);
    }
    await expect(page.locator(".market-inline-time").first()).toBeVisible();
  }
  await writeFile(`${folder}/measurements.json`, JSON.stringify(measures, null, 2));
  // Phones fold the search rail into one "Change item" bar; open it to filter.
  await page.getByRole("button", { name: /^Change item/ }).click();
  await page.getByLabel("Market city", { exact: true }).selectOption("Caerleon");
  await expect(page.locator(".market-board tbody tr")).toHaveCount(1);
  await expect(page.locator(".market-board tbody tr")).toContainText("Caerleon");
  // The masthead tabs pick the side panel: one at a time, keyboard reachable.
  await page.setViewportSize({ width: 1440, height: 900 });
  const historyTab = page.getByRole("tab", { name: "Price history", exact: true });
  const savedTab = page.getByRole("tab", { name: "Research & watchlist", exact: true });
  await expect(historyTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#market-saved-research")).toBeHidden();
  await savedTab.click();
  await expect(savedTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#market-history-research")).toBeHidden();
  await expect(page.locator(".market-research-list")).toBeVisible();
  await savedTab.press("ArrowLeft");
  await expect(historyTab).toBeFocused();
  await expect(historyTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".price-chart")).toBeVisible();
});
