import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("server menu fits short screens, closes on dismissal and replaces header search", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [844, 390],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/?region=europe");
    const picker = page.getByRole("combobox", { name: "Albion region", exact: true });
    await expect(picker).toBeEnabled();
    await expect(page.locator(".search-trigger")).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Global search", exact: true })).toHaveCount(0);
    await picker.click();
    const menu = page.locator(".region-picker-panel");
    await expect(menu).toBeInViewport();
    await expect(menu.getByRole("option")).toHaveCount(3);
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(picker).toBeFocused();
    await picker.click();
    await page.mouse.click(1, height - 1);
    await expect(menu).toHaveCount(0);
    await picker.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    await expect(menu).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
