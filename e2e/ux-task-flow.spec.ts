import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 320]) {
  test(`mobile crafting guides configuration to an independently calculated profit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/tools/crafting?region=europe");
    await expect(page.locator("#production-setup")).toBeVisible();
    await expect(page.getByLabel("Scenario title", { exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    await expect(page.getByLabel("Scenario title", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    await expect(page.locator("#production-materials")).not.toBeVisible();
    await expect(page.locator("#production-results")).not.toBeVisible();
    await expect(page.locator("main")).not.toContainText("Unavailable");
    await page.getByLabel("Crafts / upgrades", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Next: price materials", exact: true }).click();
    await expect(page.locator("#production-materials")).toBeFocused();
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
    await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
    await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
    await page.getByRole("button", { name: "Review profit", exact: true }).click();
    // 10 × (3,000 - 16 × 100 - 8 × 50) = 10,000 silver, no supplied fees or returns.
    await expect(page.locator("#production-results > strong")).toHaveText("10,000 silver");
    await expect(page.locator("#production-results")).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "1 Choose recipe", exact: true }).click();
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("10");
    await page.getByRole("button", { name: "2 Price materials", exact: true }).click();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("100");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
}
