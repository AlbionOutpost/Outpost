import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createTestDb } from "./support/db";
const db = createTestDb();
test.use({ trace: "retain-on-failure" });
test("guild activity and discovery remain readable with history, filters and private records", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  // Screenshots land in .qa/<area>-correction/current for review.
  const iteration = "current";
  const folder = `.qa/guild-correction/${iteration}`;
  await mkdir(folder, { recursive: true });
  const ids = [0, 1].map(() => `atlas-test-${randomUUID()}`),
    token = randomUUID();
  const groupIds: string[] = [];
  try {
    await db.user.create({
      data: {
        id: ids[0],
        name: "Guild visual QA fixture",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
      },
    });
    await db.user.create({ data: { id: ids[1], name: "Private outsider QA fixture" } });
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
    for (let i = 0; i < 4; i++) {
      const ownerId = ids[i === 3 ? 1 : 0];
      const group = await db.group.create({
        data: {
          name: [
            "QA Outpost expedition",
            "QA Outpost private company",
            "QA Outpost west company",
            "Hidden outsider guild",
          ][i],
          slug: `guild-qa-${randomUUID()}`,
          description: "Isolated QA records for layout review. Not a live recruiting guild.",
          region: i === 1 ? "asia" : i === 2 ? "americas" : "europe",
          visibility: i === 1 || i === 3 ? "PRIVATE" : "PUBLIC",
          ownerId,
          members: { create: { userId: ownerId, role: "OWNER" } },
        },
      });
      groupIds.push(group.id);
      if (i === 0) {
        const gear = [
          ["Main hand", "T6_MAIN_AXE"],
          ["Helmet", "T6_HEAD_CLOTH_SET1"],
          ["Chest", "T6_ARMOR_LEATHER_SET1"],
          ["Boots", "T6_SHOES_LEATHER_SET1"],
        ].map(([slot, itemId]) => ({ slot, itemId, quality: 1, abilities: {}, alternatives: [] }));
        await db.composition.create({
          data: {
            authorId: ids[0],
            groupId: group.id,
            title: "QA expedition loadouts",
            description: "Layout fixture, not a recommended combat comp.",
            region: "europe",
            contentType: "Arena",
            visibility: "GROUP",
            notes: "",
            slots: ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Support"].map((role) => ({
              id: randomUUID(),
              role,
              customRole: "",
              playerName: "",
              mandatory: true,
              substitute: "",
              notes: "",
              sourceBuildId: null,
              equipment: gear,
            })),
          },
        });
        await db.groupBuild.create({
          data: {
            groupId: group.id,
            title: "QA shared Battleaxe loadout",
            snapshot: {
              title: "QA shared Battleaxe loadout",
              description: "QA layout fixture",
              contentType: "Solo PvE",
              region: "europe",
              visibility: "PRIVATE",
              playerCount: 1,
              recommendedIP: 0,
              strategy: "",
              patchNotes: "",
              equipment: gear.map((e) => ({ ...e, abilities: "", alternatives: "" })),
            },
          },
        });
        await db.groupEvent.createMany({
          data: [
            ...Array.from({ length: 55 }, (_, n) => ({
              groupId: group.id,
              title: `Past QA activity ${n}`,
              description: "Historical test record",
              startsAt: new Date(Date.now() - (n + 1) * 86400000),
              timezone: "UTC",
              expectedParticipants: 5,
              voiceInfo: "",
            })),
            {
              groupId: group.id,
              title: "Next QA expedition",
              description: "Upcoming event fixture with manual scheduling.",
              startsAt: new Date(Date.now() + 86400000),
              timezone: "Europe/Berlin",
              expectedParticipants: 20,
              voiceInfo: "QA voice",
            },
          ],
        });
        await db.groupAnnouncement.create({
          data: {
            groupId: group.id,
            title: "Equipment check",
            body: "Bring the saved loadout and review the event before joining.",
            authorId: ids[0],
          },
        });
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
          await page.goto(`/groups/${group.slug}`);
          await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator(".guild-composition-preview")).toContainText("5 players");
          await expect(page.locator(".guild-build-preview .strip-slot.filled")).toHaveCount(4);
          await page.screenshot({ path: `${folder}/workspace-${width}.png`, fullPage: true });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        }
        if (iteration !== "00-baseline") {
          await expect(page.locator(".guild-next-event")).toContainText("Next QA expedition");
          await page.getByRole("tab", { name: "Overview", exact: true }).focus();
          await page.keyboard.press("ArrowRight");
          await expect(page.getByRole("tab", { name: "Events", exact: true })).toBeFocused();
          await expect(
            page.getByRole("heading", { name: "Next QA expedition", exact: true }),
          ).toBeVisible();
        }
      }
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.goto("/groups?q=QA+Outpost");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${folder}/discovery-${width}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    if (iteration !== "00-baseline") {
      await expect(page.locator(".guild-discovery-card")).toHaveCount(3);
      await expect(page.locator("main")).not.toContainText("Hidden outsider guild");
      await page.getByLabel("Team region", { exact: true }).selectOption("asia", { timeout: 8000 });
      await page.getByRole("button", { name: "Find teams", exact: true }).click({ timeout: 8000 });
      await expect(page.locator(".guild-discovery-card")).toHaveCount(1);
      await expect(page.locator(".guild-discovery-card")).toContainText("Private");
      await page.getByLabel("Search teams", { exact: true }).fill("no-matching-qa-guild-948");
      await page.getByRole("button", { name: "Find teams", exact: true }).click({ timeout: 8000 });
      await expect(
        page.getByRole("heading", { name: "No matching teams", exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: `${folder}/empty-320.png`, fullPage: true });
    }
  } finally {
    await db.group.deleteMany({ where: { id: { in: groupIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
