import { test, expect } from "@playwright/test";
test("tool discovery filters tasks, retains region and exposes honest starter scope", async ({
  page,
}) => {
  await page.goto("/tools?region=asia");
  await expect(page.locator(".directory-entry")).toHaveCount(20);
  await page.getByRole("button", { name: "Economy", exact: true }).click();
  await expect(page.locator(".directory-entry")).toHaveCount(12);
  await expect(page.locator(".directory-entry").filter({ hasText: "Crafting" })).toContainText(
    "Production planning",
  );
  await page.getByRole("searchbox", { name: "Find a tool" }).fill("not-a-supported-tool");
  await expect(page.getByRole("heading", { name: /No tools match/ })).toBeVisible();
  await page.getByRole("button", { name: "Reset search", exact: true }).click();
  await expect(page.locator(".directory-entry")).toHaveCount(20);
  await page.getByRole("searchbox", { name: "Find a tool" }).fill("city quotes");
  await expect(page.locator(".directory-entry")).toHaveCount(1);
  await page.locator(".directory-entry").click();
  await expect(page).toHaveURL(/\/tools\/market\?region=asia/);
  await expect(page.getByRole("combobox", { name: "Albion region" })).toHaveAttribute(
    "data-region",
    "asia",
  );
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
});
