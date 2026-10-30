import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";

const db = createTestDb();
const test = base.extend<{ visual: { buildId: string; compositionId: string } }>({
  visual: async ({ context }, provide) => {
    const id = `atlas-test-${randomUUID()}`,
      token = randomUUID();
    try {
      await db.user.create({
        data: {
          id,
          name: "Visual QA fixture",
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      const equipment = [
        ["Main hand", "T6_MAIN_AXE@1"],
        ["Helmet", "T6_HEAD_CLOTH_SET1"],
        ["Chest", "T6_ARMOR_LEATHER_SET1"],
        ["Boots", "T6_SHOES_LEATHER_SET1"],
      ].map(([slot, itemId]) => ({ slot, itemId, quality: 1, abilities: {}, alternatives: [] }));
      const build = await db.build.create({
        data: {
          authorId: id,
          title: "Battleaxe expedition · QA fixture",
          description: "Original visual fixture, not a game recommendation.",
          contentType: "Other",
          region: "europe",
          visibility: "PRIVATE",
          strategy: "",
          patchNotes: "",
          equipment: {
            create: equipment.map((e) => ({
              slot: e.slot,
              itemId: e.itemId,
              quality: e.quality,
              abilities: "",
              alternatives: "",
            })),
          },
        },
      });
      const composition = await db.composition.create({
        data: {
          authorId: id,
          title: "QA Outpost visual roster",
          description: "Original visual fixture, not a recommended team comp.",
          contentType: "Other",
          region: "europe",
          visibility: "PRIVATE",
          notes: "",
          slots: Array.from({ length: 5 }, (_, i) => ({
            id: randomUUID(),
            playerName: `QA player ${i + 1}`,
            role: "Tank",
            customRole: "",
            mandatory: true,
            substitute: "",
            notes: "",
            sourceBuildId: null,
            equipment,
          })),
        },
      });
      await context.addCookies([
        {
          name: "next-auth.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
      await provide({ buildId: build.id, compositionId: composition.id });
    } finally {
      await db.user.deleteMany({ where: { id } });
    }
  },
});

for (const width of [320, 390, 768, 1440]) {
  test(`reviewed equipment and composition visual baselines at ${width}px`, async ({
    page,
    visual,
  }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    const options = {
      animations: "disabled" as const,
      caret: "hide" as const,
      // Renderer availability must not create false pixel failures. Full review captures
      // retain real equipment art; semantic tests separately assert IDs and dimensions.
      mask: [page.locator("[data-albion-icon]")],
      maskColor: "#292629",
      // CI's Ubuntu font rasterization and the baseline machine differ by under 1% of
      // the pixels; a broken layout moves far more than that.
      maxDiffPixelRatio: 0.01,
    };
    await page.goto(`/builds/${visual.buildId}/edit`);
    await expect(page.getByLabel("Build title")).toHaveValue("Battleaxe expedition · QA fixture");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".gear-studio")).toHaveScreenshot(`equipment-${width}.png`, options);
    await page.goto("/compositions?q=QA+Outpost+visual+roster&mine=1");
    await expect(page.locator(".composition-preview-card")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".composition-directory")).toHaveScreenshot(
      `compositions-${width}.png`,
      {
        ...options,
        // The illustrated masthead's line wrapping depends on font hinting; the masthead is
        // reviewed by the page screenshots instead, so the baseline covers the directory only.
        stylePath: "e2e/support/comps-baseline.css",
      },
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    if (width <= 390) {
      const trigger = page.getByRole("button", { name: "Open navigation" });
      await trigger.click();
      const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
      await expect(
        page.getByRole("button", { name: "Close navigation", exact: true }),
      ).toBeFocused();
      await expect(drawer).toHaveScreenshot(`navigation-${width}.png`, {
        animations: "disabled",
        // CI's Ubuntu font rasterization differs from local Linux by up to ~80px here.
        maxDiffPixelRatio: 0.01,
      });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      const first = drawer.locator("a,button").first(),
        last = drawer.locator("a,button").last();
      await first.focus();
      await page.keyboard.press("Shift+Tab");
      await expect(last).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(first).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await drawer.getByRole("link", { name: "Crafting", exact: true }).click();
      await expect(page).toHaveURL(/\/tools\/crafting\?region=europe$/);
      await expect(drawer).toHaveCount(0);
    }
  });
}

test("mobile collection filters and catalog categories preserve the chosen scope", async ({
  page,
  visual,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compositions?q=QA+Outpost+visual+roster");
  const filter = page.getByRole("button", { name: "Collection filters", exact: true });
  await expect(page.getByLabel("Comp collection")).toBeHidden();
  await filter.click();
  await page.getByLabel("Comp collection").selectOption("1");
  await page.getByRole("button", { name: "Search comps", exact: true }).click();
  await expect(page).toHaveURL(/mine=1/);
  await expect(
    page.getByRole("button", { name: "Collection: My comps", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".composition-preview-card")).toHaveAttribute(
    "href",
    `/compositions/${visual.compositionId}`,
  );
  expect(
    await page
      .locator(".composition-preview-card")
      .evaluate((el) => el.getBoundingClientRect().top),
  ).toBeLessThan(500);
  await page.goto("/items?region=asia");
  await page.getByRole("combobox", { name: "Item category", exact: true }).selectOption("Cape");
  await expect(page.locator(".item-reference-browser")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".item-reference-browser tbody tr").first()).toContainText("Cape");
  await expect(page.getByRole("combobox", { name: "Enchantment", exact: true })).toHaveValue("");
});

test.afterAll(() => db.$disconnect());
