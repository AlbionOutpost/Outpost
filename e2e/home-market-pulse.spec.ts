import { test, expect } from "@playwright/test";

test("source snapshot refreshes on its cadence, pauses, retains labeled observations on failure and isolates regions", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-26T12:00:00Z") });
  let requests = 0,
    failing = false;
  await page.route("**/api/history?*", (route) =>
    route.fulfill({ json: { region: "europe", data: [] } }),
  );
  await page.route("**/api/market?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("view") !== "pulse")
      return route.fulfill({ json: { region: params.get("region"), prices: [] } });
    requests++;
    if (failing) return route.fulfill({ status: 503, json: { error: "QA source outage" } });
    return route.fulfill({
      json: {
        region: params.get("region"),
        prices: [
          {
            item_id: params.get("item"),
            city: "Lymhurst",
            quality: 1,
            sell_price_min: 1234,
            buy_price_max: 1000,
            sell_price_min_date: "2026-10-26T11:59:00Z",
            buy_price_max_date: "2026-10-26T11:59:00Z",
          },
        ],
      },
    });
  });
  await page.goto("/?region=europe");
  const pulse = page.getByRole("region", { name: "Market snapshot", exact: true });
  await expect(pulse).toHaveAttribute("aria-busy", "false");
  await expect(pulse.locator(".market-pulse-item")).toHaveCount(4);
  await expect(pulse.locator('[data-item="T4_BAG"]')).toContainText("1,234");
  expect(requests).toBe(4);
  await page.clock.fastForward(60000);
  await expect.poll(() => requests).toBe(8);
  await expect(pulse).toHaveAttribute("aria-busy", "false");
  await pulse.getByRole("button", { name: "Pause snapshot refresh" }).click();
  await page.clock.fastForward(120000);
  expect(requests).toBe(8);
  failing = true;
  await pulse.getByRole("button", { name: "Refresh market snapshot", exact: true }).click();
  await expect(pulse.locator('[data-item="T4_BAG"]')).toContainText("Refresh unavailable");
  await expect(pulse.locator('[data-item="T4_BAG"]')).toContainText("1,234");
  expect(requests).toBe(12);
  await page.getByLabel("Albion region").selectOption("asia");
  await expect(pulse).toHaveAttribute("aria-busy", "false");
  await expect(pulse).not.toContainText("1,234");
  await expect(pulse.locator('[data-item="T4_BAG"]')).toContainText("Unavailable");
});
