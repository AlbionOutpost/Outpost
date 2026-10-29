import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("research batches item qualities, distinguishes missing quotes and retains observations on failure", async ({
  page,
}) => {
  let fail = false;
  const calls: URL[] = [];
  await page.route("**/api/market/batch?*", async (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    if (fail) {
      await route.fulfill({ status: 503, json: { error: "Fixture upstream failure" } });
      return;
    }
    await route.fulfill({
      json: {
        region: url.searchParams.get("region"),
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        prices: url.searchParams
          .get("items")!
          .split(",")
          .filter((i) => i === "T4_BAG")
          .map((item_id) => ({
            item_id,
            quality: Number(url.searchParams.get("quality")),
            city: "Lymhurst",
            sell_price_min: 1234,
            buy_price_max: 0,
            sell_price_min_date: "2026-01-01T00:00:00Z",
            buy_price_max_date: "0001-01-01T00:00:00",
          })),
      },
    });
  });
  await page.goto("/tools/market?region=asia&item=T4_BAG&quality=2");
  const tray = page.locator(".market-research-list");
  await tray.locator("summary").click();
  await tray.getByRole("button", { name: "Add selected to research", exact: true }).click();
  await tray.getByRole("button", { name: "Refresh research quotes", exact: true }).click();
  await expect(tray).toContainText("1,234 silver");
  await expect(tray).toContainText("Stale");
  await expect(tray).toContainText("No buy order observed");
  const popupPromise = page.waitForEvent("popup");
  await tray.getByRole("link").first().click();
  const detail = await popupPromise;
  await expect(detail).toHaveURL(/region=asia&item=T4_BAG&quality=2/);
  await detail.close();
  await expect(tray.locator(".research-items > li")).toHaveCount(1);
  await page.getByRole("tab", { name: "Watchlist", exact: true }).click();
  await expect(tray).toBeHidden();
  await page.getByRole("tab", { name: "Research list", exact: true }).click();
  await expect(tray.locator(".research-items > li")).toHaveCount(1);
  await expect(tray).toContainText("1,234 silver");
  expect(calls).toHaveLength(1);
  expect(calls[0].searchParams.get("region")).toBe("asia");
  expect(calls[0].searchParams.get("quality")).toBe("2");
  await page.getByRole("button", { name: "Battleaxe", exact: true }).click();
  await tray.getByRole("button", { name: "Add selected to research", exact: true }).click();
  fail = true;
  await tray.getByRole("button", { name: "Refresh research quotes", exact: true }).click();
  await expect(tray).toContainText("Last observations retained");
  await expect(tray.locator(".research-items > li").nth(1)).toContainText("No observations loaded");
  await expect(tray.locator(".research-items > li").nth(1)).not.toContainText(
    "No sell listing observed",
  );
  expect(calls).toHaveLength(2);
  expect(calls[1].searchParams.get("items")).toBe("T4_BAG,T4_MAIN_AXE");
  await expect(tray).toContainText("1,234 silver");
  await mkdir(".qa/product-next/market", { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `.qa/product-next/market/research-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
