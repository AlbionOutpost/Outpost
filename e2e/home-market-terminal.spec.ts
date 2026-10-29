import { chooseRegion } from "./support/region";
import { test, expect } from "@playwright/test";

test("market overview plots source observations, preserves gaps and rejects another city or region", async ({
  page,
}) => {
  const now = Date.now();
  const points = [12, 5, 3, 1].map((days, i) => ({
    avg_price: 1000 + i * 250.125,
    timestamp: new Date(now - days * 86400000).toISOString(),
    item_count: 10,
  }));
  await page.route("**/api/market?*view=overview*", (route) =>
    route.fulfill({ json: { region: "europe", prices: [] } }),
  );
  await page.route("**/api/history?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const wrongCity = params.get("city") === "Bridgewatch";
    return route.fulfill({
      json: {
        region: "europe",
        data: [
          {
            item_id: "T4_BAG",
            quality: 1,
            location: wrongCity ? "Caerleon" : "Lymhurst",
            data: points,
          },
        ],
      },
    });
  });
  await page.goto("/?region=europe");
  const terminal = page.getByRole("region", { name: "Observed market overview" });
  await terminal.locator(".terminal-source > summary").click();
  await expect(terminal.getByRole("img")).toHaveAccessibleName(/4 observed daily/);
  await expect(terminal.locator(".chart-observation")).toHaveCount(4);
  // Gaps greater than 36 hours are separate segments, never filled-in invented dates.
  expect(
    (await terminal.locator('svg path[fill="none"]').getAttribute("d"))?.match(/M/g)?.length,
  ).toBe(4);
  await terminal.getByRole("button", { name: "7d", exact: true }).click();
  await expect(terminal.locator(".chart-observation")).toHaveCount(3);
  await expect(terminal.getByRole("table")).toContainText("1,750.375");
  await terminal.getByRole("combobox", { name: "History city" }).selectOption("Bridgewatch");
  await expect(terminal.getByRole("status")).toContainText("temporarily unavailable");
  await expect(terminal.locator(".chart-observation")).toHaveCount(0);
  await terminal.getByRole("combobox", { name: "History city" }).selectOption("Lymhurst");
  await expect(terminal.locator(".chart-observation")).toHaveCount(3);
  await chooseRegion(page, "asia");
  await expect(terminal.getByRole("status")).toContainText("temporarily unavailable");
  await expect(terminal.locator(".chart-observation")).toHaveCount(0);
});
