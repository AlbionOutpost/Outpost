import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("build details use a complete spatial inventory with synchronized equipment, abilities and alternatives", async ({
  page,
}) => {
  await page.goto("/builds/library/battleaxe-mist-build?region=asia");
  const inventory = page.getByRole("group", { name: "Equipment inventory", exact: true });
  await expect(inventory.locator("button")).toHaveCount(10);
  await inventory.locator('[data-slot="Helmet"]').click();
  await expect(page.locator(".detail-workspace")).toHaveAttribute("data-selected-slot", "Helmet");
  await expect(inventory.locator('[data-slot="Helmet"]')).toHaveAccessibleDescription(/Retaliate/);
  await expect(page.locator("#build-gear-Helmet > button")).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .locator(".detail-selected-abilities")
      .getByLabel("Helmet recorded abilities", { exact: true }),
  ).toContainText("Retaliate");
  await expect(page.locator("#build-alternatives-Helmet")).toHaveClass(/is-selected/);
  await expect(
    page
      .locator(".detail-selected-item")
      .getByRole("link", { name: "Compare prices", exact: true }),
  ).toHaveAttribute("href", /region=asia&item=T8_HEAD_LEATHER_SET2&quality=1/);
  await page.locator("#build-alternatives > summary").click();
  const helmetTab = page.getByRole("tab", { name: /^Helmet/ });
  await helmetTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".detail-workspace")).toHaveAttribute("data-selected-slot", "Chest");
  await expect(page.getByRole("tab", { name: /^Chest/ })).toBeFocused();
  await expect(page.locator("#build-alternatives-Chest")).toBeVisible();
  await helmetTab.click();
  const alternativeSpellIcons = page.locator(
    "#build-alternatives-Helmet .detail-alternative-spells img",
  );
  await expect(alternativeSpellIcons).toHaveCount(2);
  const firstSpell = await alternativeSpellIcons.nth(0).boundingBox();
  const secondSpell = await alternativeSpellIcons.nth(1).boundingBox();
  expect(Math.abs(firstSpell!.y - secondSpell!.y)).toBeLessThan(2);

  await expect(
    page
      .locator("#build-alternatives-Helmet")
      .getByRole("link", { name: "Compare prices · Normal", exact: true }),
  ).toHaveAttribute("href", /region=asia&item=T8_HEAD_CLOTH_HELL&quality=1/);
  await expect(
    inventory.locator('[data-slot="Helmet"] img[data-albion-icon]').first(),
  ).toHaveAttribute("src", /T8_HEAD_LEATHER_SET2/);
  await inventory.locator('[data-slot="Mount"]').click();
  await expect(page.locator(".detail-selected-abilities")).toContainText("No item equipped");
  await expect(page.locator(".detail-summary-panel")).toContainText("Mount");
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: width >= 1440 ? 900 : 844 });
    await page.evaluate(() => document.fonts.ready);
    const box = async (slot: string) => {
      const b = await inventory.locator(`[data-slot="${slot}"]`).boundingBox();
      expect(b).not.toBeNull();
      return b!;
    };
    const [bag, head, cape, main, chest, off, potion, boots, food, mount] = await Promise.all(
      [
        "Bag",
        "Helmet",
        "Cape",
        "Main hand",
        "Chest",
        "Off hand",
        "Potion",
        "Boots",
        "Food",
        "Mount",
      ].map(box),
    );
    expect(Math.abs(head.y - bag.y)).toBeLessThan(2);
    expect(Math.abs(head.y - cape.y)).toBeLessThan(2);
    expect(main.y).toBeGreaterThan(head.y);
    expect(Math.abs(main.y - chest.y)).toBeLessThan(2);
    expect(Math.abs(main.y - off.y)).toBeLessThan(2);
    expect(potion.y).toBeGreaterThan(main.y);
    expect(Math.abs(potion.y - boots.y)).toBeLessThan(2);
    expect(Math.abs(potion.y - food.y)).toBeLessThan(2);
    expect(mount.y).toBeGreaterThan(boots.y);
    expect(Math.abs(mount.x + mount.width / 2 - head.x - head.width / 2)).toBeLessThan(2);
    expect(bag.x).toBeLessThan(head.x);
    expect(head.x).toBeLessThan(cape.x);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px document overflow`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await inventory.locator('[data-slot="Helmet"]').focus();
  await expect(
    inventory.locator('.inventory-equipment-cell[data-area="head"] [role="tooltip"]'),
  ).toContainText("Retaliate");
  await page.keyboard.press("Enter");
  await expect(page.locator(".detail-workspace")).toHaveAttribute("data-selected-slot", "Helmet");
  const inspector = page
    .locator(".detail-summary-panel")
    .getByRole("heading", { name: "Helmet", exact: true });
  await expect(inspector).toBeFocused();
  const inspectorBox = await inspector.boundingBox();
  expect(inspectorBox!.y).toBeGreaterThanOrEqual(0);
  expect(inspectorBox!.y + inspectorBox!.height).toBeLessThan(844);
  await page.getByRole("link", { name: "Back to equipment", exact: false }).click();
  await expect(inventory).toBeInViewport();
  expect(
    await inventory
      .locator(".inventory-slot-caption")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(12);
  expect(
    await page
      .locator(".detail-selected-abilities .detail-spell-choice > span")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(12);

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const href of [
    "#build-overview",
    "#build-equipment",
    "#build-abilities",
    "#build-alternatives",
    "#build-stats",
    "#build-discussion",
  ]) {
    await expect(
      page
        .getByRole("navigation", { name: "Build sections", exact: true })
        .locator(`a[href="${href}"]`),
    ).toHaveCount(1);
    await expect(page.locator(href)).toHaveCount(1);
  }
});
