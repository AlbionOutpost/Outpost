import { expect, test } from "@playwright/test";

test("a market refresh preserves a newer manual edit and warns about undated observations", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/api/economy/prices?*", async (route) => {
    requested = true;
    await held;
    const price = (value: number) => ({
      value,
      manual: false,
      observedAt: null,
      region: "europe",
      city: "Lymhurst",
      quality: 1,
    });
    await route.fulfill({
      json: {
        prices: {
          T4_METALBAR: price(100),
          T4_PLANKS: price(50),
          T4_MAIN_AXE: price(3000),
        },
      },
    });
  });
  await page.goto("/tools/crafting?region=europe");
  await page.getByText("Station settings, focus & sources", { exact: true }).click();
  await page.getByText("Markets & transaction fees", { exact: true }).click();
  await page.getByLabel("Replace manual overrides", { exact: true }).selectOption("yes");
  await page.getByRole("button", { name: "Load market observations", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("175");
  release!();
  await expect(
    page.getByRole("button", { name: "Load market observations", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("175");
  // 16 × 175 + 8 × 50 = 3,200 cost, 3,000 revenue, no supplied fees/returns.
  await expect(page.locator("output[data-result=total-profit]")).toHaveText("-200");
  await expect(
    page.getByText("Stale or undated source observations included.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".qa/foundations/production-undated-390.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a zero source-price sentinel cannot produce a complete profit estimate", async ({ page }) => {
  await page.route("**/api/economy/prices?*", async (route) => {
    const price = (value: number) => ({
      value,
      manual: false,
      observedAt: new Date().toISOString(),
      region: "europe",
      city: "Lymhurst",
      quality: 1,
    });
    await route.fulfill({
      json: {
        prices: {
          T4_METALBAR: price(100),
          T4_PLANKS: price(50),
          T4_MAIN_AXE: price(0),
        },
      },
    });
  });
  await page.goto("/tools/crafting?region=europe");
  await page.getByText("Station settings, focus & sources", { exact: true }).click();
  await page.getByText("Markets & transaction fees", { exact: true }).click();
  await page.getByRole("button", { name: "Load market observations", exact: true }).click();
  await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("100");
  await expect(page.getByLabel("Output unit sale price", { exact: true })).toHaveValue("");
  await expect(page.locator("output[data-result=total-profit]")).toHaveCount(0);
  await expect(page.locator(".production-result-start")).toContainText("Finish pricing your run");
  await expect(
    page.getByRole("status").filter({ hasText: "Missing or mismatched observations" }),
  ).toContainText("T4 Battleaxe");
  await page.getByLabel("Output unit sale price", { exact: true }).fill("0");
  await expect(page.locator("output[data-result=total-profit]")).toHaveText("-2,000");
});
