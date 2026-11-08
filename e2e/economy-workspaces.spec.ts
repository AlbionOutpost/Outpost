import { expectResultText } from "./support/result-text";
import { test, expect } from "@playwright/test";

test("production prerequisites, genuine sensitivity and the steps beside their result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/economy/prices")) requests++;
  });
  await page.goto("/tools/crafting?region=europe");
  await expect(
    page.getByRole("heading", { name: "Step 1: Recipe and run", exact: true }),
  ).toBeVisible();
  const readiness = page.locator("[data-result=readiness]");
  await expect(readiness).toContainText("Steel Bar unit price");
  await expect(readiness).toContainText("Pine Planks unit price");
  await expect(readiness).toContainText("T4 Battleaxe sale price");
  expect(requests).toBe(0);
  const bounds = await page.locator("#production-setup").evaluate((e) =>
    ["#production-setup", "#production-materials", "#production-results"].map((s) => {
      const r = e.ownerDocument.querySelector(s)!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  // Wide screens: every step side by side in the first row, the result last.
  const [setup, materials, results] = bounds;
  expect(Math.abs(setup.y - results.y)).toBeLessThan(2);
  expect(Math.abs(setup.y - materials.y)).toBeLessThan(2);
  expect(setup.x + setup.width).toBeLessThan(materials.x);
  expect(materials.x + materials.width).toBeLessThan(results.x);
  // The working view starts on the first screen, under the compact masthead.
  expect(setup.y).toBeLessThan(300);
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
  await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
  await expect(page.locator("output[data-result=total-profit]")).toHaveCount(0);
  await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
  await expectResultText(page.locator("output[data-result=total-profit]"), "1,000", {
    exact: true,
  });
  await page.getByRole("button", { name: "Run details", exact: true }).click();
  await expectResultText(
    page.getByRole("region", { name: "Sale-price sensitivity scenarios" }),
    "400",
  );
  await page.getByLabel("Output unit sale price", { exact: true }).fill("1000");
  await expectResultText(page.locator("output[data-result=total-profit]"), "-1,000", {
    exact: true,
  });
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "3 Review profit", exact: true }).click();
  await expect(page.locator("#production-results")).toBeVisible();
  await expect(page.locator("#production-results")).toBeFocused();
  const progressBounds = await page
    .getByRole("navigation", { name: "Crafting workflow" })
    .boundingBox();
  const resultBounds = await page.locator("#production-results").boundingBox();
  expect(resultBounds!.y).toBeGreaterThan(progressBounds!.y + progressBounds!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("manual trade requires prices, accepts explicit zero, and shows negative outcomes", async ({
  page,
}) => {
  await page.goto("/tools/flipping?region=asia");
  await page.getByRole("tab", { name: "Check one trade", exact: true }).click();
  const result = page.locator('[data-result="trade-profit"]');
  await expect(page.locator('[data-result="readiness"]')).toContainText("Purchase price per item");
  await expect(page.getByLabel("Purchase price per item", { exact: true })).toHaveValue("");
  await page.getByLabel("Purchase price per item", { exact: true }).fill("100");
  await page.getByLabel("Sale price per item", { exact: true }).fill("50");
  await expectResultText(result, "-50", { exact: true });
  await page.getByLabel("Sale price per item", { exact: true }).fill("0");
  await expectResultText(result, "-100", { exact: true });
  await page.getByLabel("Sale price per item", { exact: true }).fill("");
  await expect(page.locator('[data-result="readiness"]')).toContainText("Sale price per item");
  await expect(result).toHaveText("—Unavailable");
});

test("item filters recover from no results and item back links retain server", async ({ page }) => {
  await page.goto("/items?region=asia");
  await page
    .getByLabel("Search item name or identifier", { exact: true })
    .fill("zzznomatchingitemzzz");
  await expect(page.getByText("No items match these filters", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click();
  await expect(page.getByText("7,510 items", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.locator(".item-catalog-grid .item-catalog-row")).toHaveCount(30);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".item-catalog-row")).toHaveCount(30);
  await page.goto("/items/T4_MAIN_AXE?region=asia");
  await expect(page.locator(".masthead-back")).toHaveAttribute("href", "/items?region=asia");
  await expect(page.getByRole("heading", { name: "Recipe", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Calculate this recipe", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/crafting\?.*recipe=/);
  await expect(page.locator("[data-recipe-identity]")).toContainText("Adept's Battleaxe · T4.0");
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
  const state = page.locator(".gold-research-workspace .history-state");
  await expect(state.getByRole("status")).toHaveText("Loading history…");
  await expect(state.getByRole("status")).toContainText("No gold observations for this server yet");
  await page.route("**/api/history?*", (route) =>
    route.fulfill({ status: 503, json: { error: "History source unavailable" } }),
  );
  await page.getByRole("button", { name: "Refresh history", exact: true }).click();
  // The failure is said once, in one well, with a retry.
  await expect(state.getByRole("status")).toHaveText("History could not load right now.");
  await expect(state.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(page.locator(".gold-research-workspace").getByRole("alert")).toHaveCount(0);
});

for (const [route, label] of [
  ["cooking", "Cooking recipe"],
  ["alchemy", "Alchemy recipe"],
]) {
  test(`${route} keeps its own recipe identity and historical status`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/tools/${route}?region=europe`);
    await expect(page.locator("[data-recipe-identity]")).toContainText(label);
    await expect(page.locator("[data-recipe-status]")).toBeVisible();
    await expect(page.locator("[data-recipe-status]")).toContainText("Historical recipe");
    // This movement is a post-hydration layout effect; wait for its visible outcome.
    await expect
      .poll(async () =>
        page.getByRole("navigation", { name: "Production calculators" }).evaluate((navigation) => {
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
  await page.getByRole("tab", { name: "Check one trade", exact: true }).click();
  await expect(page.getByLabel("Sales tax (%)", { exact: true })).toBeHidden();
  await page.getByLabel("Purchase price per item", { exact: true }).fill("100");
  await page.getByLabel("Sale price per item", { exact: true }).fill("150");
  await page.getByText("Fees & extra costs", { exact: true }).click();
  await page.getByLabel("Sales tax (%)", { exact: true }).fill("10");
  await page.getByText("Fees & extra costs", { exact: true }).click();
  // 150 - 100 - 15 sales tax = 35; collapsing must not reset the fee.
  await expectResultText(page.locator('[data-result="trade-profit"]'), "35", { exact: true });
  await expect(page.locator("#trade-inputs [data-assumptions]")).toContainText("10% tax");
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeHidden();

  await page.goto("/tools/transporting?region=europe");
  await expect(page.getByLabel("Cost per trip", { exact: true })).toBeHidden();
  // Phones show one step at a time: prices are step 2, trip costs step 1.
  const transportSteps = page.getByRole("navigation", { name: "Transport workflow" });
  await transportSteps.getByRole("button", { name: /Price cargo/ }).click();
  await page.getByLabel("Transport purchase unit price", { exact: true }).fill("100");
  await page.getByLabel("Transport sale unit price", { exact: true }).fill("150");
  await transportSteps.getByRole("button", { name: /Route & cargo/ }).click();
  await page.getByText("Trip costs, risk & fees", { exact: true }).click();
  await page.getByLabel("Cost per trip", { exact: true }).fill("10");
  await page.getByText("Trip costs, risk & fees", { exact: true }).click();
  // The validated transport model requires at least one trip: 150-100-10=40.
  await expectResultText(page.locator('[data-result="transport-profit"]'), "40", { exact: true });
  await expect(page.locator("#transport-route [data-assumptions]")).toContainText("10 silver/trip");
  await expect(page.getByLabel("Transport plan title", { exact: true })).toBeHidden();

  await page.goto("/tools/farming?region=europe");
  await expect(page.getByLabel("Unwatered seed yield (%)", { exact: true })).toBeHidden();
  await page.getByLabel("Harvest per plant", { exact: true }).fill("8");
  const farmingSteps = page.getByRole("navigation", { name: "Farming workflow" });
  await farmingSteps.getByRole("button", { name: /Price it/ }).click();
  await page.getByLabel("Seed unit price · silver", { exact: true }).fill("2000");
  await page.getByLabel("Produce unit price · silver", { exact: true }).fill("100");
  await farmingSteps.getByRole("button", { name: /Plan harvest/ }).click();
  await page.getByText("Seed returns & fees", { exact: true }).click();
  await page.getByLabel("Unwatered seed yield (%)", { exact: true }).fill("50");
  await page.getByText("Seed returns & fees", { exact: true }).click();
  // Nine plants: 7200 revenue-18000 seeds+9000 retained seed credit=-1800.
  await expectResultText(page.locator('[data-result="farm-profit"]'), "-1,800", { exact: true });
  await expect(page.locator("#farming-plan [data-assumptions]")).toContainText("50% unwatered");
  await expect(page.getByLabel("Scenario title", { exact: true })).toBeHidden();
});
