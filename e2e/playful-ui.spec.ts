import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("tool navigation keeps the chosen region without a global search overlay", async ({
  page,
}) => {
  await page.goto("/?region=asia");
  await expect(page.locator(".search-trigger")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Global search", exact: true })).toHaveCount(0);
  await page.locator(".desktop-navigation summary").filter({ hasText: "Tools" }).click();
  const transport = page.locator(".desktop-navigation").getByRole("link", { name: /^Transport\b/ });
  await expect(transport).toHaveAttribute("href", "/tools/transporting?region=asia");
  await transport.click();
  await expect(page).toHaveURL(/tools\/transporting\?region=asia/);
  await expect(page.getByLabel("Albion region", { exact: true })).toHaveAttribute(
    "data-region",
    "asia",
  );
});

test("equipment selection opens the real item, and the redesigned server selector and menus remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?region=europe");
  const item = page.locator(".landing-card:first-child .landing-card-action");
  // The shell streams behind a Suspense fallback; wait for the real page before auditing it.
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute(
    "href",
    "/tools/market?item=T6_METALBAR&quality=1&region=europe",
  );
  await page.getByRole("combobox", { name: "Albion region" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.locator(".desktop-navigation summary").filter({ hasText: "Tools" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await item.click();
  await expect(page).toHaveURL(/tools\/market.*item=T6_METALBAR/);
});
