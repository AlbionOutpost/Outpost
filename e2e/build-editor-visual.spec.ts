import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("populated build editor preserves gear, choices and revisions across responsive editing", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const { iteration } = JSON.parse(
    await readFile("docs/design-review/build-editor/current-iteration.json", "utf8"),
  );
  const folder = `.qa/build-editor-correction/${iteration}`;
  await mkdir(folder, { recursive: true });
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Build visual QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const gear = [
    ["Main hand", "T6_MAIN_AXE@1"],
    ["Off hand", "T6_OFF_SHIELD"],
    ["Helmet", "T6_HEAD_CLOTH_SET1"],
    ["Chest", "T6_ARMOR_LEATHER_SET1"],
    ["Boots", "T6_SHOES_LEATHER_SET1"],
    ["Cape", "T6_CAPE"],
    ["Bag", "T6_BAG"],
    ["Mount", "T4_MOUNT_HORSE"],
  ];
  try {
    const build = await db.build.create({
      data: {
        authorId: id,
        title: "Battleaxe loadout / QA fixture",
        description: "Temporary isolated visual fixture, not a meta recommendation.",
        contentType: "Other",
        region: "europe",
        visibility: "PRIVATE",
        strategy: "",
        patchNotes: "",
        equipment: {
          create: gear.map(([slot, itemId]) => ({
            slot,
            itemId,
            quality: 1,
            abilities: "",
            alternatives: "",
            abilitySelections:
              slot === "Main hand" ? { Q: "Rending Strike", E: "Blood Bandit" } : {},
            alternativeItemIds: slot === "Main hand" ? ["T4_MAIN_AXE", "T5_MAIN_AXE"] : [],
          })),
        },
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
    const measures = [];
    for (const width of [1440, 1920, 768, 390, 375, 320]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 900 : width === 1920 ? 1080 : width === 768 ? 1024 : 844,
      });
      await page.goto(`/builds/${build.id}/edit`);
      await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
        "Battleaxe loadout / QA fixture",
      );
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".gear-studio").scrollIntoViewIfNeeded();
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll<HTMLImageElement>(".gear-studio img")].every(
              (i) => i.complete,
            ),
          null,
          { timeout: 8000 },
        )
        .catch(() => undefined);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${folder}/editor-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${folder}/viewport-${width}.png`, fullPage: false });
      measures.push(
        await page.evaluate(
          (width) => ({
            width,
            overflow: document.documentElement.scrollWidth > innerWidth,
            panes: [".gear-studio", ".gear-browser", ".gear-character", ".gear-details"].map(
              (selector) => {
                const r = document.querySelector(selector)!.getBoundingClientRect();
                return { selector, x: r.x, y: r.y, width: r.width, height: r.height };
              },
            ),
          }),
          width,
        ),
      );
      expect(measures.at(-1)!.overflow).toBe(false);
    }
    await writeFile(`${folder}/measurements.json`, JSON.stringify(measures, null, 2));
    await page.getByRole("button", { name: "Item details", exact: true }).click();
    await page.getByLabel("Main hand alternative", { exact: true }).selectOption("T4_MAIN_AXE@1");
    await expect(page.getByLabel("Main hand alternative 2", { exact: true })).toHaveValue(
      "T5_MAIN_AXE",
    );
    await page.getByRole("button", { name: "Equipment", exact: true }).click();
    await page.getByRole("button", { name: /^Select Main hand slot\b/ }).click();
    await page.getByLabel("Browse tier", { exact: true }).selectOption("3");
    await expect(page.getByRole("button", { name: /^Equip Battleaxe\b/ })).toHaveCount(0);
    await expect(
      page.getByText("No supported item matches this slot, search and tier/enchantment filters.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Equipment", exact: true }).click();
    await page.getByRole("button", { name: /^Select Helmet slot\b/ }).click();
    await expect(page.getByLabel("Search equipment")).toBeVisible();
    await page.getByRole("button", { name: /^Equip Scholar Cowl\b/ }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Helmet Active", { exact: true }).selectOption("Energy Shield");
    await page.getByRole("button", { name: "Save new revision", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/builds/${build.id}$`));
    await page.goto(`/builds/${build.id}/edit`);
    await page.getByRole("button", { name: /^Select Helmet slot\b/ }).click();
    await page.getByRole("button", { name: "Item details", exact: true }).click();
    await expect(page.getByLabel("Helmet Active", { exact: true })).toHaveValue("Energy Shield");
    const saved = await db.build.findUniqueOrThrow({
      where: { id: build.id },
      include: { equipment: true },
    });
    expect(saved.version).toBe(2);
    expect(saved.equipment).toHaveLength(8);
    expect(saved.equipment.find((e) => e.slot === "Main hand")!.alternativeItemIds).toEqual([
      "T4_MAIN_AXE@1",
      "T5_MAIN_AXE",
    ]);
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
