import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("search palette clears on dismissal, supports keyboard navigation and keeps the chosen region", async ({
  page,
}) => {
  await page.goto("/?region=asia");
  await page.getByRole("button", { name: "Search Albion… Ctrl K", exact: true }).click();
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
  await expect(page.getByLabel("Albion region", { exact: true })).toHaveValue("asia");
});

test("equipment selection opens the real item, and the redesigned search and menus remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?region=europe");
  await page.getByRole("button", { name: "Broadsword", exact: true }).click();
  const item = page.getByRole("link", { name: "Inspect Broadsword", exact: true });
  await expect(item).toHaveAttribute("href", "/items/T4_MAIN_SWORD?region=europe");
  await expect(item.locator("img")).toHaveAttribute("src", /T4_MAIN_SWORD/);
  await page.keyboard.press("Control+k");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.locator(".desktop-navigation summary").click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await item.click();
  await expect(page).toHaveURL(/items\/T4_MAIN_SWORD/);
});
