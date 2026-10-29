import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("search palette clears on dismissal, supports keyboard navigation and keeps the chosen region", async ({
  page,
}) => {
  await page.goto("/?region=asia");
  await page.getByRole("button", { name: "Search items, builds… Ctrl K", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Global search", exact: true });
  const input = dialog.getByRole("searchbox");
  await expect(input).toBeFocused();
  await input.fill("transport");
  await expect(
    dialog.getByRole("link", { name: "Tools Transport planner", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(input).toHaveValue("");
  await input.fill("transport");
  await expect(
    dialog.getByRole("link", { name: "Tools Transport planner", exact: true }),
  ).toHaveAttribute("href", "/tools/transporting?region=asia");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/tools\/transporting\?region=asia/);
  await expect(page.getByLabel("Albion region", { exact: true })).toHaveAttribute(
    "data-region",
    "asia",
  );
});

test("equipment selection opens the real item, and the redesigned search and menus remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?region=europe");
  const preview = page.getByRole("region", { name: "Observed market overview" });
  const item = preview.getByRole("link", { name: "Explore market", exact: true });
  await expect(item).toHaveAttribute("href", "/tools/market?region=europe&item=T4_BAG");
  await page.keyboard.press("Control+k");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.locator(".desktop-navigation summary").filter({ hasText: "Tools" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await item.click();
  await expect(page).toHaveURL(/tools\/market.*item=T4_BAG/);
});
