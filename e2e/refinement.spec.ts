import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";

const db = createTestDb();
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
async function ready(page: Page) {
  await page.locator("main h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(result.violations).toEqual([]);
}

test("populated equipment and party controls include visible names at phone, tablet and desktop widths", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Accessibility QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const equipment = [
    { slot: "Main hand", itemId: "T6_MAIN_AXE@1", quality: 1, abilities: {}, alternatives: [] },
  ];
  try {
    const build = await db.build.create({
      data: {
        authorId: id,
        title: "Accessible equipment QA fixture",
        description: "Isolated test, not a recommended game build.",
        visibility: "PRIVATE",
        region: "europe",
        contentType: "Other",
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
    const comp = await db.composition.create({
      data: {
        authorId: id,
        title: "Accessible party QA fixture",
        description: "Isolated test roster.",
        visibility: "PRIVATE",
        region: "europe",
        contentType: "Other",
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
    for (const width of [320, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/builds/${build.id}/edit`);
      await ready(page);
      const slot = page.locator('.character-slot[data-slot="Main hand"]');
      await expect(slot).toHaveAccessibleName(/Select Main hand slot: Main hand Battleaxe T6\.1/);
      await expect(page.locator('.character-slot[data-slot="Food"]')).toHaveAccessibleName(
        /Food Empty/,
      );
      await accessible(page);
      await slot.click();
      if (width <= 780)
        await expect(page.getByLabel("Search equipment", { exact: true })).toBeFocused();
      const choice = page.getByRole("button", { name: /^Equip Battleaxe T6\.1$/ });
      await expect(choice).toBeVisible();
      await accessible(page);
      await choice.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Main hand equipment", { exact: true })).toHaveValue("MAIN_AXE");
      if (width <= 780)
        await expect(page.getByLabel("Main hand equipment", { exact: true })).toBeFocused();
      await accessible(page);
      await page.goto(`/compositions/${comp.id}/edit`);
      await ready(page);
      const member = page.getByRole("button", { name: /^Edit player 1 loadout:/ });
      await expect(member).toHaveAccessibleName(/Tank QA player 1/);
      await accessible(page);
    }
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});

test("long item provenance fits 320px and remains readable and copyable", async ({ page }) => {
  const release = await db.catalogRelease.create({
    data: {
      version: `qa-reflow-${randomUUID()}`,
      sourceUrl: "https://example.org/fixture",
      rightsReference: `Original QA fixture; not live game data. Source revision ${"a".repeat(40)}; checksum ${"b".repeat(64)}.`,
      checksum: "qa-reflow",
      itemCount: 1,
    },
  });
  const id = "T4_REFLOW_QA_FIXTURE";
  try {
    await db.itemMetadata.create({
      data: {
        id,
        name: "Original provenance QA fixture",
        slot: "Main hand",
        tier: 4,
        enchantment: 0,
        abilities: [],
        releaseId: release.id,
      },
    });
    for (const width of [320, 375, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/items/${id}?region=asia`);
      await ready(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const provenance = page.locator(".item-metadata-detail");
      await expect(provenance).toContainText("b".repeat(64));
      expect(await provenance.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await accessible(page);
    }
  } finally {
    await db.itemMetadata.deleteMany({ where: { releaseId: release.id } });
    await db.catalogRelease.delete({ where: { id: release.id } });
  }
});

test.afterAll(() => db.$disconnect());
