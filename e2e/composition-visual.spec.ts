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
  const { iteration } = JSON.parse(
    await readFile("docs/design-review/composition/current-iteration.json", "utf8"),
  );
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
        await page.goto(`/compositions/${comp.id}/edit`);
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
          ).toHaveCount(9);
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
        await expect(page).toHaveURL(new RegExp(`/compositions/${comp.id}$`));
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
