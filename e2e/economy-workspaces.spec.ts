import { test, expect } from "@playwright/test";

test("production prerequisites, genuine sensitivity and three-column composition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/economy/prices")) requests++;
  });
  await page.goto("/tools/crafting?region=europe");
  await expect(page.getByRole("heading", { name: "Configuration", exact: true })).toBeVisible();
  const readiness = page.locator("#production-results .calculation-readiness");
  await expect(readiness).toContainText("Steel Bar unit price");
  await expect(readiness).toContainText("Pine Planks unit price");
  await expect(readiness).toContainText("T4 Battleaxe sale price");
  expect(requests).toBe(0);
  const bounds = await page.locator(".production-workspace").evaluate((e) =>
    [".calculator-inputs", ".production-materials", "#production-results"].map((s) => {
      const r = e.querySelector(s)!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width };
    }),
  );
  expect(Math.max(...bounds.map((b) => b.y)) - Math.min(...bounds.map((b) => b.y))).toBeLessThan(2);
  expect(bounds[0].x + bounds[0].width).toBeLessThan(bounds[1].x);
  expect(bounds[1].x + bounds[1].width).toBeLessThan(bounds[2].x);
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
  await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
  await expect(page.locator("output[data-result=total-profit]")).toHaveCount(0);
  await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
  await expect(page.locator("output[data-result=total-profit]")).toHaveText("1,000");
  await expect(
    page.getByRole("region", { name: "Sale-price sensitivity scenarios" }),
  ).toContainText("400");
  await page.getByLabel("Output unit sale price", { exact: true }).fill("1000");
  await expect(page.locator("output[data-result=total-profit]")).toHaveText("-1,000");
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "3 Review profit", exact: true }).click();
  await expect(page.locator("#production-results")).toBeVisible();
  await expect(page.locator("#production-results")).toBeFocused();
  const progressBounds = await page.locator(".production-steps").boundingBox();
  const resultBounds = await page.locator("#production-results").boundingBox();
  expect(resultBounds!.y).toBeGreaterThan(progressBounds!.y + progressBounds!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("manual trade requires prices, accepts explicit zero, and shows negative outcomes", async ({
  page,
}) => {
  await page.goto("/tools/flipping?region=asia");
  const result = page.locator(".manual-trade-workspace .result");
  await expect(result).toContainText("Add your trade prices");
  await expect(page.getByLabel("Purchase price per item", { exact: true })).toHaveValue("");
  await page.getByLabel("Purchase price per item", { exact: true }).fill("100");
  await page.getByLabel("Sale price per item", { exact: true }).fill("50");
  await expect(result.locator(":scope > strong")).toHaveText("-50 silver");
  await page.getByLabel("Sale price per item", { exact: true }).fill("0");
  await expect(result.locator(":scope > strong")).toHaveText("-100 silver");
  await page.getByLabel("Sale price per item", { exact: true }).fill("");
  await expect(result).toContainText("Add your trade prices");
  await expect(result.locator(":scope > strong")).toHaveText("— silver");
});

test("item filters recover from no results and item back links retain server", async ({ page }) => {
  await page.goto("/items?region=asia");
  await page
    .getByLabel("Search item name or identifier", { exact: true })
    .fill("zzznomatchingitemzzz");
  await expect(page.getByRole("heading", { name: "No items match these filters" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByText("7,510 matching items", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.locator(".item-catalog-grid article")).toHaveCount(30);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".item-reference-browser tbody tr")).toHaveCount(30);
  await page.goto("/items/T4_MAIN_AXE?region=asia");
  await expect(page.locator(".masthead-back")).toHaveAttribute("href", "/items?region=asia");
  await expect(page.getByRole("heading", { name: "Recipe", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Calculate this recipe", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/crafting\?.*recipe=/);
  await expect(page.locator(".reference-recipe-identity")).toContainText(
    "Adept's Battleaxe · T4.0",
  );
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  await expect(page.getByRole("combobox", { name: "Albion region", exact: true })).toContainText(
    "Asia",
  );
});

test("gold history has distinct loading, empty and error recovery", async ({ page }) => {
  await page.route("**/api/history?*", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ json: { data: [] } });
  });
  await page.goto("/tools/gold?region=europe");
  await expect(page.getByRole("heading", { name: "Loading price history…" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No observations for this selection" }),
  ).toBeVisible();
  await page.route("**/api/history?*", (route) =>
    route.fulfill({ status: 503, json: { error: "History source unavailable" } }),
  );
  await page.getByRole("button", { name: "Refresh history", exact: true }).click();
  await expect(page.locator(".gold-research-workspace").getByRole("alert")).toContainText(
    "History source unavailable",
  );
  await expect(page.getByRole("heading", { name: "History is unavailable" })).toBeVisible();
});

for (const [route, label] of [
  ["cooking", "Cooking recipe"],
  ["alchemy", "Alchemy recipe"],
]) {
  test(`${route} keeps its own recipe identity and historical status`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/tools/${route}?region=europe`);
    await expect(page.locator(".reference-recipe-identity")).toContainText(label);
    await expect(page.locator(".recipe-historical-status")).toBeVisible();
    await expect(page.locator(".recipe-historical-status")).toContainText("Historical recipe");
    // This movement is a post-hydration layout effect; wait for its visible outcome.
    await expect
      .poll(async () =>
        page.locator(".production-mode-nav").evaluate((navigation) => {
          const rail = navigation.getBoundingClientRect();
          const tab = navigation.querySelector('[aria-current="page"]')!.getBoundingClientRect();
          return tab.left >= rail.left - 1 && tab.right <= rail.right + 1;
        }),
      )
      .toBe(true);
    await expect(page.locator("output[data-result=total-profit]")).toHaveCount(0);
  });
}

test("mobile secondary assumptions collapse without changing the calculated result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/flipping?region=europe");
  await expect(page.getByLabel("Sales tax (%)", { exact: true })).toBeHidden();
  await page.getByLabel("Purchase price per item", { exact: true }).fill("100");
  await page.getByLabel("Sale price per item", { exact: true }).fill("150");
  await page.getByText("Fees & extra costs", { exact: true }).click();
  await page.getByLabel("Sales tax (%)", { exact: true }).fill("10");
  await page.getByText("Fees & extra costs", { exact: true }).click();
  // 150 - 100 - 15 sales tax = 35; collapsing must not reset the fee.
  await expect(page.locator(".manual-trade-workspace .result > strong")).toHaveText("35 silver");
  await expect(page.locator(".economy-assumption-readout")).toContainText("10% tax");
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeHidden();

  await page.goto("/tools/transporting?region=europe");
  await expect(page.getByLabel("Cost per trip", { exact: true })).toBeHidden();
  await page.getByLabel("Transport purchase unit price", { exact: true }).fill("100");
  await page.getByLabel("Transport sale unit price", { exact: true }).fill("150");
  await page.getByText("Trip costs, risk & fees", { exact: true }).click();
  await page.getByLabel("Cost per trip", { exact: true }).fill("10");
  await page.getByText("Trip costs, risk & fees", { exact: true }).click();
  // The validated transport model requires at least one trip: 150-100-10=40.
  await expect(page.locator(".transport-workspace .result > strong")).toHaveText("40");
  await expect(page.locator(".economy-assumption-readout")).toContainText("10 silver/trip");
  await expect(page.getByLabel("Transport plan title", { exact: true })).toBeHidden();

  await page.goto("/tools/farming?region=europe");
  await expect(page.getByLabel("Unwatered seed yield (%)", { exact: true })).toBeHidden();
  await page.getByLabel("Harvest per plant", { exact: true }).fill("8");
  await page.getByLabel("Seed unit price · silver", { exact: true }).fill("2000");
  await page.getByLabel("Produce unit price · silver", { exact: true }).fill("100");
  await page.getByText("Seed returns & fees", { exact: true }).click();
  await page.getByLabel("Unwatered seed yield (%)", { exact: true }).fill("50");
  await page.getByText("Seed returns & fees", { exact: true }).click();
  // Nine plants: 7200 revenue-18000 seeds+9000 retained seed credit=-1800.
  await expect(page.locator('[data-result="farm-profit"]')).toHaveText("-1,800");
  await expect(page.locator(".economy-assumption-readout")).toContainText("50% unwatered");
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeHidden();
});
