import { test, expect } from "@playwright/test";

test("Outpost branding, landing actions and navigation retain working destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?region=asia");
  await expect(page).toHaveTitle(/Outpost/);
  await expect(page.locator("h1")).toHaveText("Plan. Trade. Build.Play smarter.");
  await expect(page.locator(".top-brand")).toHaveAccessibleName("Outpost home");
  await expect(page.locator(".product-sidebar")).toHaveCount(0);
  await expect(page.locator(".site-header .desktop-navigation")).toBeVisible();
  const logo = page.locator(".top-brand img");
  await expect(logo).toHaveAttribute("alt", "Outpost");
  await expect(logo).toHaveAttribute("src", /outpost-logo/);
  await logo.evaluate((node: HTMLImageElement) => node.decode());
  expect(await logo.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "Explore market", exact: true })).toHaveAttribute(
    "href",
    "/tools/market?region=asia",
  );
  await expect(page.getByRole("link", { name: "Create a build", exact: true })).toHaveAttribute(
    "href",
    "/builds/new?region=asia",
  );
  await expect(page.locator(".featured-tool")).toHaveCount(4);
  await expect(page.locator(".field-map, .atlas-art")).toHaveCount(0);
  await page.getByRole("link", { name: "Guides", exact: true }).click();
  await expect(page.locator(".desktop-navigation a[aria-current=page]")).toHaveText("Guides");
  await expect(
    page.getByRole("heading", { name: "Read a market quote", exact: true }),
  ).toBeVisible();
  await page.locator(".account-dropdown summary").click();
  await page.getByRole("link", { name: "Sign in with Discord", exact: true }).click();
  await expect(page).toHaveURL(/signin/);
  await expect(page.locator("main")).toContainText(/Discord/);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/light/);
});
