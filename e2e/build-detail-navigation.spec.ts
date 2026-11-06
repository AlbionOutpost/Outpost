import { test, expect } from "@playwright/test";

// The build page has no section tabs (the "Build details" disclosures are the sections); deep links
// to a section still open it, follow history and survive a reload.
test("build section deep links open their section through history and reload", async ({ page }) => {
  await page.goto("/builds/library/battleaxe-mist-build?region=asia#build-stats");
  await expect(page.getByRole("navigation", { name: "Build sections", exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator("#build-stats")).toHaveAttribute("open", "");

  await page.goto("/builds/library/battleaxe-mist-build?region=asia#build-abilities");
  await expect(page).toHaveURL(/\?region=asia#build-abilities$/);
  await expect(page.locator("#build-abilities")).toBeInViewport();

  await page.goto("/builds/library/battleaxe-mist-build?region=asia#build-alternatives");
  await expect(page.locator("#build-alternatives")).toHaveAttribute("open", "");

  await page.goBack();
  await expect(page).toHaveURL(/#build-abilities$/);
  await page.goForward();
  await expect(page).toHaveURL(/#build-alternatives$/);

  await page.reload();
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  await expect(page.locator("#build-alternatives")).toHaveAttribute("open", "");
  await page.goto("/builds/library/battleaxe-mist-build?region=asia#build-alternatives-Helmet");
  await expect(page.locator(".detail-workspace")).toHaveAttribute("data-selected-slot", "Helmet");
  await expect(page.locator("#build-alternatives-Helmet")).toBeVisible();
  await expect(page.locator(".detail-selected-item")).toContainText("Hunter Hood");
  await expect(page.locator("#build-alternatives-Helmet")).toBeInViewport();
  await page.locator("#build-alternatives > summary").click();
  await expect(page.locator("#build-alternatives")).not.toHaveAttribute("open", "");
});
