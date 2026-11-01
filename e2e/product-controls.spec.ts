import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("custom region picker preserves query state, keyboard choice, dismissal and persisted server", async ({
  page,
}) => {
  await page.goto("/tools/market?item=T4_BAG&quality=3&region=europe");
  const picker = page.getByRole("combobox", { name: "Albion region", exact: true });
  await picker.click();
  await expect(page.getByRole("listbox", { name: "Game servers" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Europe", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(picker).toHaveAttribute("data-region", "asia");
  await expect(page).toHaveURL(/item=T4_BAG&quality=3&region=asia/);
  await expect(picker).toBeFocused();
  await picker.click();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await expect(picker).toBeFocused();
  await picker.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await page.goto("/builds");
  await expect(picker).toHaveAttribute("data-region", "asia");
});

test("reduced-motion header stays still and theme/sign-in remain clear on narrow screens", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const signin = page.getByRole("link", { name: "Sign in", exact: true });
  const before = await signin.boundingBox();
  await signin.hover();
  expect(await signin.boundingBox()).toEqual(before);
  const theme = page.getByRole("button", { name: "Toggle theme", exact: true });
  await theme.click();
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".app")).toHaveClass(/light/);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeInViewport();
    await page.getByRole("combobox", { name: "Albion region" }).click();
    await expect(page.getByRole("listbox", { name: "Game servers" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press("Escape");
  }
});

test("recipe drawer searches real variants, returns focus and keeps accounting independent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/crafting");
  const change = page.getByRole("button", { name: "Change recipe", exact: true });
  await change.click();
  const drawer = page.getByRole("dialog", { name: "Choose recipe", exact: true });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("Search crafting recipes").fill("Broadsword");
  await drawer.getByRole("button", { name: /^Adept's Broadsword T4\.0 · / }).click();
  await expect(drawer).toHaveCount(0);
  await expect(change).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Adept's Broadsword · T4.0", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "2 Price materials", exact: true }).click();
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
  await page.getByLabel("Worked Leather unit price", { exact: true }).fill("200");
  await page.getByLabel("Output unit sale price", { exact: true }).fill("5000");
  await page.getByRole("button", { name: "3 Review profit", exact: true }).click();
  // Independent one-craft expectation: 16*100 + 8*200 = 3200; no supplied fees/returns.
  await expect(page.locator("output[data-result=total-profit]")).toHaveText("1,800");
  await expect(page.locator(".production-cash-summary")).toContainText("3,200");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
