import { test, expect } from "@playwright/test";

test("activity cards open the matching library category and preserve region", async ({ page }) => {
  await page.goto("/builds/library?region=americas");
  await page
    .getByRole("navigation", { name: "Build collections" })
    .getByRole("link", { name: "Activities", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Choose your activity" })).toBeVisible();
  const activities = page.getByRole("region", { name: "Build activities" });
  await expect(activities.locator("h3")).toHaveCount(32);
  const mists = activities.getByRole("link", { name: /Solo Mists/ });
  await expect(mists).toHaveAttribute("href", /category=MISTS_SOLO.*region=americas/);
  await mists.click();
  await expect(page).toHaveURL(/category=MISTS_SOLO/);
  await expect(page.locator("#library-activity")).toHaveValue("MISTS_SOLO");
  await expect(page.locator(".library-build-card").first()).toHaveAttribute(
    "data-activity",
    "MISTS_SOLO",
  );
});

test("mobile activity art loads and empty categories stay truthful", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builds/activities");
  const mists = page.getByRole("link", { name: /Solo Mists/ });
  await expect(mists.locator("img")).toBeVisible();
  await expect
    .poll(() => mists.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Arena No builds listed yet", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No loadouts match that search" })).toBeVisible();
  await expect(page.locator("#library-activity")).toHaveValue("ARENA");
  await page.getByRole("link", { name: "Clear filters", exact: true }).last().click();
  await expect(page.locator(".library-build-card").first()).toBeVisible();
});

test("main Builds navigation opens activity discovery", async ({ page }) => {
  await page.goto("/?region=asia");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Builds", exact: true })
    .click();
  await expect(page).toHaveURL(/\/builds\/activities\?region=asia/);
  await expect(page.getByRole("heading", { name: "Choose your activity" })).toBeVisible();
  await page
    .getByRole("region", { name: "Build activities" })
    .getByRole("link", { name: /Hellgates 5v5/ })
    .click();
  await expect(page.locator("#library-activity")).toHaveValue("HELLGATE_5V5");
  await expect(page).toHaveURL(/region=asia/);
});
