import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("search has one field, contained results scrolling, clear focus and an accessible short-screen layout", async ({
  page,
}) => {
  // Repeated real item identities exercise result scrolling, not real search observations.
  await page.route("**/api/search?*", (route) =>
    route.fulfill({
      json: {
        results: Array.from({ length: 25 }, (_, i) => ({
          category: "Items",
          title: `Bag · T${4 + (i % 5)}.0`,
          url: `/items/T${4 + (i % 5)}_BAG`,
        })),
      },
    }),
  );
  for (const [width, height] of [
    [320, 568],
    [844, 390],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Search items, builds… Ctrl K", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Global search", exact: true });
    const field = dialog.getByRole("searchbox");
    await expect(field).toBeFocused();
    const fieldBounds = (await dialog.locator(".command-input-wrap").boundingBox())!;
    await page.mouse.click(
      fieldBounds.x + fieldBounds.width / 2,
      fieldBounds.y + fieldBounds.height + 6,
    );
    await expect(dialog).toBeVisible();
    expect(await field.evaluate((el) => getComputedStyle(el).borderWidth)).toBe("0px");
    await expect(
      dialog.getByRole("button", { name: "Close search", exact: true }),
    ).toBeInViewport();
    await expect(dialog.locator(".command-footer")).toBeInViewport();
    await field.fill("Bag");
    const results = dialog.locator(".command-result");
    await expect(results).toHaveCount(25);
    await page.keyboard.press("ArrowUp");
    await expect(results.last()).toBeFocused();
    await expect(results.last()).toBeInViewport();
    expect(await dialog.locator(".command-body").evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(field).toBeInViewport();
    await expect(
      dialog.getByRole("button", { name: "Close search", exact: true }),
    ).toBeInViewport();
    await dialog.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(field).toHaveValue("");
    await expect(field).toBeFocused();
    await expect(dialog.locator(".command-result")).toHaveCount(0);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(1, 1);
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});
