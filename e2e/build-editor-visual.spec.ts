import { selectEditorSlot } from "./support/build-editor";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
            abilities: slot === "Off hand" ? "Keep this shield note" : "",
            alternatives: slot === "Off hand" ? "Shield author swap note" : "",
            abilitySelections:
              slot === "Main hand"
                ? { Q: "Rending Strike", E: "Blood Bandit", Passive: "Deep Cuts" }
                : {},
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
            panes: [".build-studio", ".studio-loadout-list", ".editor-inventory-panel"].map(
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
      if (width <= 980) {
        for (const name of ["Abilities", "Alternatives"]) {
          await page.getByRole("tab", { name, exact: true }).click();
          const inspector = page.locator("#editor-selected-slot");
          await expect(inspector).toBeFocused();
          const position = await inspector.boundingBox();
          const header = await page.locator(".site-header").boundingBox();
          const tabs = await page.getByRole("tablist", { name: "Build workspace" }).boundingBox();
          expect(tabs!.y).toBeGreaterThanOrEqual(-0.5);
          expect(tabs!.y).toBeLessThanOrEqual(0.5);
          expect(position!.y).toBeGreaterThanOrEqual(
            Math.max(header!.y + header!.height, tabs!.y + tabs!.height),
          );
          expect(position!.y).toBeLessThan(200);
        }
        const abilities = page.getByRole("tab", { name: "Abilities", exact: true });
        const alternatives = page.getByRole("tab", { name: "Alternatives", exact: true });
        await abilities.focus();
        await page.keyboard.press("ArrowRight");
        await expect(alternatives).toBeFocused();
        await page.keyboard.press("ArrowLeft");
        await expect(abilities).toBeFocused();
      }
      if ([390, 1440].includes(width)) {
        await selectEditorSlot(page, "Helmet");
        await page.getByRole("button", { name: /^Choose Helmet equipment:/ }).click();
        const drawer = page.getByRole("dialog", { name: "Equipment picker", exact: true });
        await expect(drawer).toBeVisible();
        const geometry = await drawer.evaluate((element) => {
          const heading = element.querySelector(".editor-dialog-heading h2")!;
          const bodyHeading = element.querySelector(".studio-picker-heading h3")!;
          const item = element.querySelector(".studio-picker-item")!;
          const strong = item.querySelector("strong")!;
          const tier = item.querySelector("small")!;
          return {
            dialog: element.getBoundingClientRect().toJSON(),
            viewport: innerHeight,
            headingX: heading.getBoundingClientRect().x,
            bodyHeadingX: bodyHeading.getBoundingClientRect().x,
            nameX: strong.getBoundingClientRect().x,
            tierX: tier.getBoundingClientRect().x,
            nameAlignment: getComputedStyle(strong).textAlign,
            clip: getComputedStyle(element).clipPath,
          };
        });
        expect(geometry.dialog.y).toBe(0);
        expect(geometry.dialog.height).toBe(geometry.viewport);
        expect(geometry.dialog.bottom).toBe(geometry.viewport);
        expect(Math.abs(geometry.headingX - geometry.bodyHeadingX)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.nameX - geometry.tierX)).toBeLessThanOrEqual(1);
        expect(geometry.nameAlignment).toBe("left");
        expect(geometry.clip).toBe("none");
        await page.keyboard.press("Escape");
        await expect(drawer).toHaveCount(0);
      }
    }
    await writeFile(`${folder}/measurements.json`, JSON.stringify(measures, null, 2));
    await selectEditorSlot(page, "Main hand", "Alternatives");
    await page.getByLabel("Spare set name", { exact: true }).fill("QA alternate loadout");
    await page.getByRole("button", { name: "Save active as spare set", exact: true }).click();
    await expect(page.locator(".saved-equipment-sets > article")).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByLabel("Main hand alternative", { exact: true }).selectOption("T4_MAIN_AXE@1");
    await expect(page.getByLabel("Main hand alternative 2", { exact: true })).toHaveValue(
      "T5_MAIN_AXE",
    );
    await page.getByRole("button", { name: /^Equip alternative Main hand 1:/ }).click();
    await expect(page.getByLabel("Main hand alternative", { exact: true })).toHaveValue(
      "T6_MAIN_AXE@1",
    );
    await selectEditorSlot(page, "Main hand", "Abilities");
    await expect(page.getByLabel("Main hand Q", { exact: true })).toHaveValue("Rending Strike");
    await expect(page.getByLabel("Main hand E", { exact: true })).toHaveValue("Blood Bandit");
    await page
      .getByLabel("Build title", { exact: true })
      .fill("Unrelated title retained through Undo");
    await page.getByRole("button", { name: "Undo equipment change", exact: true }).click();
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Unrelated title retained through Undo",
    );
    await page.getByLabel("Build title", { exact: true }).fill("Battleaxe loadout / QA fixture");
    await selectEditorSlot(page, "Main hand");
    await expect(page.getByLabel("Main hand tier", { exact: true })).toHaveValue("6");
    await selectEditorSlot(page, "Main hand", "Alternatives");
    await page.getByLabel("Main hand alternative", { exact: true }).selectOption("T6_2H_CLAYMORE");
    await page.getByRole("button", { name: /^Equip alternative Main hand 1:/ }).click();
    await expect(
      page.getByRole("button", { name: /^Inspect Main hand: Claymore\b/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Inspect Off hand Empty", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Main hand alternative", { exact: true })).toHaveValue(
      "T6_MAIN_AXE@1",
    );
    await expect(page.getByLabel("Main hand alternative 2", { exact: true })).toHaveValue(
      "T5_MAIN_AXE",
    );
    await selectEditorSlot(page, "Main hand", "Abilities");
    await expect(page.getByLabel("Main hand Q", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Main hand E", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Main hand Passive", { exact: true })).toHaveValue("Deep Cuts");
    const unchanged = await db.build.findUniqueOrThrow({
      where: { id: build.id },
      include: { equipment: true },
    });
    expect(unchanged.version).toBe(1);
    expect(unchanged.equipment.find((row) => row.slot === "Main hand")!.itemId).toBe(
      "T6_MAIN_AXE@1",
    );
    expect(unchanged.equipment.find((row) => row.slot === "Off hand")!.abilities).toBe(
      "Keep this shield note",
    );
    await page.getByRole("button", { name: "Undo equipment change", exact: true }).click();
    await expect(page.getByLabel("Main hand Q", { exact: true })).toHaveValue("Rending Strike");
    await expect(page.getByLabel("Main hand E", { exact: true })).toHaveValue("Blood Bandit");
    await expect(page.getByRole("button", { name: /^Inspect Off hand: Shield\b/ })).toBeVisible();
    await page.getByText("Import & export", { exact: true }).click();
    const undoDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export build JSON", exact: true }).click();
    const restoredDraft = JSON.parse(await readFile((await (await undoDownload).path())!, "utf8"));
    expect(
      restoredDraft.equipment.find((row: { slot: string }) => row.slot === "Off hand"),
    ).toMatchObject({
      itemId: "T6_OFF_SHIELD",
      abilities: "Keep this shield note",
      alternatives: "Shield author swap note",
    });
    await selectEditorSlot(page, "Main hand", "Alternatives");
    await page.getByLabel("Main hand alternative", { exact: true }).selectOption("T4_MAIN_AXE@1");
    await selectEditorSlot(page, "Main hand");
    await page.getByRole("button", { name: "Choose Main hand equipment", exact: false }).click();
    await page.getByLabel("Browse tier", { exact: true }).selectOption("3");
    await expect(page.getByRole("button", { name: /^Equip Battleaxe\b/ })).toHaveCount(0);
    await expect(
      page.getByText("No supported item matches this slot, search and tier/enchantment filters.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await selectEditorSlot(page, "Helmet");

    await page.getByRole("button", { name: "Choose Helmet equipment", exact: false }).click();
    await expect(page.getByLabel("Search equipment")).toBeVisible();
    await page.getByRole("button", { name: /^Equip Scholar Cowl\b/ }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Helmet Active", { exact: true }).selectOption("Energy Shield");
    await page.getByRole("button", { name: "Save new revision", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/builds/${build.id}$`));
    await page.goto(`/builds/${build.id}/edit`);
    await selectEditorSlot(page, "Helmet");
    await page.getByRole("button", { name: "Choose Helmet equipment", exact: false }).click();
    await page.keyboard.press("Escape");
    await selectEditorSlot(page, "Helmet", "Abilities");
    await expect(page.getByLabel("Helmet Active", { exact: true })).toHaveValue("Energy Shield");
    const saved = await db.build.findUniqueOrThrow({
      where: { id: build.id },
      include: { equipment: true },
    });
    expect(saved.version).toBe(2);
    expect(saved.equipment).toHaveLength(8);
    expect(saved.equipmentSets).toHaveLength(1);
    expect(saved.equipment.find((e) => e.slot === "Main hand")!.alternativeItemIds).toEqual([
      "T4_MAIN_AXE@1",
      "T5_MAIN_AXE",
    ]);
    await page.getByRole("button", { name: "Preview build", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "Build preview", exact: true });
    await expect(preview).toBeVisible();
    await preview.getByRole("link", { name: "Check loadout cost", exact: true }).first().click();
    const costs = preview.getByRole("region", { name: "Preview loadout cost", exact: true });
    await expect(costs).toBeInViewport();
    await expect(
      costs.getByRole("button", { name: "Check loadout prices", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
