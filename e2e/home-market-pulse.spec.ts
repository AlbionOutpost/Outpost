import { test, expect } from "@playwright/test";

test("market first use separates configuration, loading, source failure and a genuine missing response", async ({
  page,
}) => {
  let calls = 0;
  let release: () => void = () => {};
  await page.route("**/api/market?*", async (route) => {
    calls++;
    if (calls === 1) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return route.fulfill({ status: 503, json: { error: "Source did not respond" } });
    }
    return route.fulfill({ json: { region: "europe", prices: [] } });
  });
  await page.goto("/tools/market?region=europe&city=Caerleon");
  await expect(page.getByLabel("Market city", { exact: true })).toHaveValue("Caerleon");
  await expect(page.locator(".market-first-use")).toContainText("Choose an item");
  await expect(page.locator(".market-quote-summary")).toHaveCount(0);
  expect(calls).toBe(0);
  await page.getByLabel("Quality", { exact: true }).selectOption("2");
  await page.getByLabel("Market city", { exact: true }).selectOption("Caerleon");
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fetching observations…", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("Source did not respond");
  await expect(page.locator(".market-first-use")).toContainText("Your selection is kept");
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Market city", { exact: true })).toHaveValue("Caerleon");
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await expect(page.locator(".task-state")).toContainText(
    "No price observations for this selection",
  );
  await expect(page.locator(".task-state")).toContainText("No last observation is known");
  await expect(page.locator(".market-item-panel")).toBeVisible();
});

test("quality coverage is requested explicitly and never substitutes a different quality silently", async ({
  page,
}) => {
  let priceCalls = 0;
  let coverageCalls = 0;
  await page.route("**/api/market?*", async (route) => {
    priceCalls++;
    return route.fulfill({ json: { region: "europe", prices: [] } });
  });
  await page.route("**/api/market/qualities?*", async (route) => {
    coverageCalls++;
    return route.fulfill({
      json: {
        region: "europe",
        item: "T4_BAG",
        city: null,
        source: "Albion Online Data Project",
        fetchedAt: new Date().toISOString(),
        qualities: [1, 2, 3, 4, 5].map((quality) => ({
          quality,
          sell: quality === 2 ? 2345 : null,
          sellCity: quality === 2 ? "Bridgewatch" : null,
          sellObservedAt: quality === 2 ? "2020-01-01T12:00:00Z" : null,
          buy: quality === 2 ? 2200 : null,
          buyCity: quality === 2 ? "Black Market" : null,
          buyObservedAt: quality === 2 ? "2020-01-01T12:00:00Z" : null,
        })),
      },
    });
  });
  await page.goto("/tools/market?region=europe");
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await expect(page.locator(".task-state")).toContainText("No price observations");
  expect(coverageCalls).toBe(0);
  await page.getByRole("button", { name: "Check other qualities", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Quality availability comparison", exact: true }),
  ).toContainText("2,345");
  await expect(
    page.getByRole("region", { name: "Quality availability comparison", exact: true }),
  ).toContainText("Bridgewatch · Needs recheck");
  expect(coverageCalls).toBe(1);
  for (const stamp of await page.locator(".market-quality-availability td small").all()) {
    expect(await stamp.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  }
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue("1");
  await page.getByRole("button", { name: "Use Good", exact: true }).click();
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Quality", { exact: true })).toBeFocused();
  expect(priceCalls).toBe(1);
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await expect(page.locator(".task-state")).toContainText("No price observations");
  expect(priceCalls).toBe(2);
});
