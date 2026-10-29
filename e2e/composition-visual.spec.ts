import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("populated five and twenty player fixtures remain editable and export a wide PNG", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  // Screenshots land in .qa/<area>-correction/current for review.
  const iteration = "current";
  const folder = `.qa/composition-correction/${iteration}`;
  await mkdir(folder, { recursive: true });
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Comp visual QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
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
  const roles = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Support"];
  const equipment = [
    ["Main hand", "T6_MAIN_AXE@1"],
    ["Off hand", "T6_OFF_SHIELD"],
    ["Helmet", "T6_HEAD_CLOTH_SET1"],
    ["Chest", "T6_ARMOR_LEATHER_SET1"],
    ["Boots", "T6_SHOES_LEATHER_SET1"],
    ["Cape", "T6_CAPE"],
    ["Mount", "T4_MOUNT_HORSE"],
  ].map(([slot, itemId]) => ({ slot, itemId, quality: 1, abilities: {}, alternatives: [] }));
  try {
    for (const count of [5, 7, 20]) {
      const comp = await db.composition.create({
        data: {
          authorId: id,
          title: `${count} player visual QA fixture`,
          description: "Isolated layout fixture, not a recommended combat comp.",
          region: "europe",
          contentType: "Arena",
          visibility: "PRIVATE",
          notes: "",
          slots: Array.from({ length: count }, (_, i) => ({
            id: randomUUID(),
            role: roles[i % roles.length],
            customRole: "",
            playerName: `QA player ${i + 1}`,
            mandatory: true,
            substitute: "",
            notes: "",
            sourceBuildId: null,
            equipment,
          })),
        },
      });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
        if (count === 5) {
          await page.goto(`/compositions/${comp.id}`);
          await expect(page.locator(".party-loadout-card")).toHaveCount(5);
          const contained = await page.locator(".party-loadout-card").evaluateAll((cards) =>
            cards.every((card) => {
              const box = card.getBoundingClientRect();
              return [...card.querySelectorAll(".party-gear-cell")].every((cell) => {
                const gear = cell.getBoundingClientRect();
                return gear.left >= box.left && gear.right <= box.right;
              });
            }),
          );
          expect(contained).toBe(true);
          if (width <= 390) {
            expect(
              await page
                .locator(".party-loadout-card")
                .first()
                .evaluate((el) => el.getBoundingClientRect().top),
            ).toBeLessThan(900);
          }
        }
        await page.goto(`/compositions/${comp.id}/edit`);
        if (count === 5 && width === 1440) {
          await page.getByRole("button", { name: "7 players", exact: true }).click();
          await expect(page.locator(".party-loadout-card")).toHaveCount(7);
          await page.getByRole("button", { name: "Undo roster change", exact: true }).click();
          await expect(page.locator(".party-loadout-card")).toHaveCount(5);
          await expect(page.locator(".party-loadout-card").first()).toContainText("QA player 1");
        }
        if (count === 5 && width <= 390) {
          const card = page.locator(".party-loadout-card").first();
          await expect(card).toBeVisible();
          const cardBounds = await card.boundingBox();
          const headingBounds = await card.locator(".party-card-heading").boundingBox();
          expect(cardBounds!.height).toBeLessThan(600);
          expect(headingBounds!.width).toBeGreaterThan(120);
        }
        await expect(page.getByLabel("Comp title", { exact: true })).toBeVisible();
        await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
          `${count} player visual QA fixture`,
        );
        await page.evaluate(() => document.fonts.ready);
        if (count <= 7) {
          await expect(page.getByRole("button", { name: /Edit player \d loadout/ })).toHaveCount(
            count,
          );
          await page.locator(".party-board").scrollIntoViewIfNeeded();
          await expect(
            page.locator(".party-loadout-card").first().locator(".party-gear-cell:visible"),
          ).toHaveCount(10);
          const bag = page.locator(".party-loadout-card").first().locator('[data-slot="Bag"]');
          const helmet = page
            .locator(".party-loadout-card")
            .first()
            .locator('[data-slot="Helmet"]');
          const mount = page.locator(".party-loadout-card").first().locator('[data-slot="Mount"]');
          const [bagBox, helmetBox, mountBox] = await Promise.all([
            bag.boundingBox(),
            helmet.boundingBox(),
            mount.boundingBox(),
          ]);
          expect(bagBox!.x).toBeLessThan(helmetBox!.x);
          expect(Math.abs(bagBox!.y - helmetBox!.y)).toBeLessThan(2);
          expect(mountBox!.y).toBeGreaterThan(helmetBox!.y);

          await page
            .waitForFunction(
              () =>
                [...document.querySelectorAll<HTMLImageElement>(".party-board img")].every(
                  (i) => i.complete,
                ),
              null,
              { timeout: 8000 },
            )
            .catch(() => undefined);
          await page
            .locator(".party-board")
            .screenshot({ path: `${folder}/board-${count}-${width}.png` });
        } else {
          await expect(page.locator(".party-roster")).toBeVisible();
          await expect(page.locator(".party-roster [role=listitem]")).toHaveCount(20);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${folder}/${count}-players-${width}.png`, fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      if (count === 5) {
        await page.getByLabel("Comp layout", { exact: true }).selectOption("roster");
        await expect(page.locator(".party-roster [role=listitem]")).toHaveCount(5);
        await page.getByLabel("Comp layout", { exact: true }).selectOption("auto");
        await page.getByRole("button", { name: /^Edit player 1 loadout\b/ }).click();
        await page.getByLabel("Player name", { exact: true }).fill("QA caller changed");
        await page.getByRole("button", { name: "Done editing member", exact: true }).click();
        await page.getByRole("button", { name: "Save comp revision", exact: true }).click();
        await expect(page).toHaveURL(
          (url) =>
            url.pathname === `/compositions/${comp.id}` &&
            url.searchParams.get("region") === "europe",
        );
        await page.reload();
        await expect(page.getByRole("region", { name: "Visual party loadouts" })).toContainText(
          "QA caller changed",
        );
      } else if (count === 20) {
        await page.getByLabel("PNG size", { exact: true }).selectOption("1080");
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export PNG", exact: true }).click();
        await (await download).saveAs(`${folder}/20-player-export-1080.png`);
        const bytes = await readFile(`${folder}/20-player-export-1080.png`);
        expect(bytes.readUInt32BE(16)).toBe(1920);
        expect(bytes.readUInt32BE(20)).toBe(1080);
      }
    }
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
