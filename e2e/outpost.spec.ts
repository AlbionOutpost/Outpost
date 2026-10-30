import { test, expect } from "@playwright/test";

test("Outpost branding, landing actions and navigation retain working destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?region=asia");
  await expect(page).toHaveTitle(/Outpost/);
  await expect(page.locator("h1")).toHaveText("Your Albionadvantage.");
  await expect(page.locator(".top-brand")).toHaveAccessibleName("Outpost home");
  await expect(page.locator(".product-sidebar")).toHaveCount(0);
  await expect(page.locator(".site-header .desktop-navigation")).toBeVisible();
  const logo = page.locator(".top-brand img");
  await expect(logo).toHaveAttribute("alt", "Outpost");
  await expect(logo).toHaveAttribute("src", /outpost-logo/);
  await logo.evaluate((node: HTMLImageElement) => node.decode());
  expect(await logo.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator(".landing-preview.is-lead .landing-preview-action")).toHaveAttribute(
    "href",
    "/tools/market?item=T6_METALBAR&quality=1&region=asia",
  );
  await expect(page.locator(".landing-benefits > li")).toHaveCount(4);
  await expect(page.locator(".home-terminal, .terminal-city-prices")).toHaveCount(0);
  await expect(page.locator(".field-map, .atlas-art")).toHaveCount(0);
  const browse = page.getByRole("link", { name: "Browse Builds", exact: true }).first();
  await expect(browse).toHaveAttribute("href", "/builds/library?region=asia");
  await browse.click();
  await expect(page).toHaveURL(/\/builds\/library\?region=asia$/);
  const create = page.getByRole("link", { name: "Create a build", exact: true });
  await expect(create).toHaveAttribute("href", "/builds/new?region=asia");
  await create.click();
  await expect(page).toHaveURL(/\/builds\/new\?region=asia$/);
  await expect(page.getByRole("textbox", { name: "Build title", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Guides", exact: true }).click();
  await expect(page.locator(".desktop-navigation a[aria-current=page]")).toHaveText("Guides");
  await expect(
    page.getByRole("heading", { name: "Read a market quote", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
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
