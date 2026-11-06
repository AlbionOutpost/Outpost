import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { createTestDb } from "./support/db";
const db = createTestDb();
for (const edit of ["equipment", "spare sets", "notes"] as const) {
  test(`pending build assignment preserves newer member ${edit}`, async ({ page, context }) => {
    const userId = `atlas-test-${randomUUID()}`,
      token = randomUUID();
    let release: (() => void) | undefined;
    let copiedBuildId = "";
    try {
      await db.user.create({
        data: {
          id: userId,
          name: "Copy race tester",
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      const build = await db.build.create({
        data: {
          authorId: userId,
          title: "Delayed axe build",
          description: "",
          strategy: "",
          patchNotes: "",
          contentType: "ZvZ",
          region: "europe",
          visibility: "PRIVATE",
          equipmentSets: [],
          equipment: {
            create: [
              {
                slot: "Main hand",
                itemId: "T4_MAIN_AXE",
                quality: 1,
                abilities: "Source author notes",
                alternatives: "",
                abilitySelections: {},
                alternativeItemIds: [],
              },
            ],
          },
        },
      });
      copiedBuildId = build.id;
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
      let started!: () => void;
      const requested = new Promise<void>((resolve) => {
        started = resolve;
      });
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/compositions/loadout?**", async (route) => {
        started();
        await held;
        const response = await route.fetch();
        await route.fulfill({ response });
      });
      await page.goto("/compositions/new");
      await page.getByRole("button", { name: "Add member", exact: true }).click();
      if (edit === "spare sets")
        await page.getByLabel("Main hand equipment", { exact: true }).selectOption("MAIN_SWORD");
      await page.getByLabel("Copy loadout from build", { exact: true }).selectOption(build.id);
      await requested;
      if (edit === "equipment")
        await page.getByLabel("Main hand equipment", { exact: true }).selectOption("MAIN_SWORD");
      if (edit === "spare sets") {
        await page.locator(".equipment-set-tools > details > summary").click();
        await page.getByLabel("Spare set name", { exact: true }).fill("Newer sword spare");
        await page.getByRole("button", { name: "Save active as spare set", exact: true }).click();
      }
      if (edit === "notes")
        await page.getByLabel("Member notes", { exact: true }).fill("My newer member note");
      release!();
      if (edit === "notes") {
        await expect(page.getByLabel("Main hand equipment", { exact: true })).toHaveValue(
          "MAIN_AXE",
        );
        await expect(page.getByRole("textbox", { name: "Member notes", exact: true })).toHaveValue(
          /My newer member note\nMain hand author ability notes: Source author notes/,
        );
      } else {
        await expect(page.getByLabel("Copy loadout from build", { exact: true })).toBeEnabled();
        await expect(page.getByLabel("Main hand equipment", { exact: true })).toHaveValue(
          "MAIN_SWORD",
        );
        if (edit === "spare sets")
          await expect(
            page.getByRole("heading", { name: "Newer sword spare", exact: true }),
          ).toBeVisible();
      }
      await page.getByRole("button", { name: "Done editing member", exact: true }).click();
      await expect(
        page.getByText(
          edit === "notes"
            ? "Loadout copied into this member. Review the equipment and notes before saving."
            : "This member's loadout changed while the build loaded. Your equipment and spare sets were kept; assign again to replace them.",
          { exact: true },
        ),
      ).toBeVisible();
    } finally {
      release?.();
      if (copiedBuildId)
        await db.build.deleteMany({ where: { id: copiedBuildId, authorId: userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
  });
}

test("20-player comp saves, reloads, edits, shares, duplicates and enforces group permissions", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  const ids = Array.from({ length: 4 }, () => `atlas-test-${randomUUID()}`);
  const tokens = ids.map(() => randomUUID());
  const clients = [
    context,
    await browser.newContext({ baseURL: "http://localhost:3000" }),
    await browser.newContext({ baseURL: "http://localhost:3000" }),
    await browser.newContext({ baseURL: "http://localhost:3000" }),
  ];
  let groupId = "";
  try {
    for (let i = 0; i < ids.length; i++) {
      await db.user.create({
        data: {
          id: ids[i],
          name: `Composition tester ${i}`,
          sessions: { create: { sessionToken: tokens[i], expires: new Date(Date.now() + 600000) } },
        },
      });
      await clients[i].addCookies([
        {
          name: "next-auth.session-token",
          value: tokens[i],
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    const group = await context.request.post("/api/groups", {
      headers: { origin: "http://localhost:3000" },
      data: {
        name: "Comp test guild",
        slug: `qa-${randomUUID().slice(0, 8)}`,
        description: "",
        region: "europe",
        visibility: "PRIVATE",
      },
    });
    expect(group.status()).toBe(201);
    groupId = (await group.json()).id;
    await db.groupMember.createMany({
      data: [
        { groupId, userId: ids[1], role: "OFFICER" },
        { groupId, userId: ids[2], role: "MEMBER" },
      ],
    });
    await page.goto("/compositions/new");
    await page.getByLabel("Comp title").fill("Twenty player ZvZ roster");
    await page.getByRole("button", { name: "20 players", exact: true }).click();
    await expect(
      page.getByRole("list", { name: "Comp roster", exact: true }).getByRole("listitem"),
    ).toHaveCount(20);
    await page.getByRole("button", { name: /^Configure member 1\b/ }).click();
    await page.getByLabel("Player name", { exact: true }).fill("Caller One");
    await page.getByLabel("Member role").selectOption("Caller");
    await page.getByLabel("Main hand equipment", { exact: true }).selectOption("MAIN_AXE");
    await page.getByLabel("Main hand tier").selectOption("6");
    await page.getByLabel("Main hand enchantment").selectOption("1");
    await page.getByLabel("Main hand E", { exact: true }).selectOption("Blood Bandit");
    await page.getByLabel("Main hand Q", { exact: true }).selectOption("Rending Strike");
    await page.getByRole("button", { name: /^Select Helmet slot\b/ }).click();
    await page.getByLabel("Helmet equipment", { exact: true }).selectOption("HEAD_CLOTH_SET1");
    await page.getByLabel("Helmet Active").selectOption("Energy Shield");
    await page.getByLabel("Member notes").fill("First engage caller");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await page
      .getByRole("button", { name: "Drag member 1", exact: true })
      .dragTo(
        page.getByRole("list", { name: "Comp roster", exact: true }).getByRole("listitem").nth(1),
      );
    await expect(
      page.getByRole("list", { name: "Comp roster", exact: true }).getByRole("listitem").nth(1),
    ).toContainText("Caller One");
    await page.getByRole("button", { name: /^Configure member 20\b/ }).click();
    await page.getByLabel("Player name", { exact: true }).fill("Scout Twenty");
    await page.getByLabel("Member role").selectOption("Scout");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await page.getByText("Shotcaller notes", { exact: true }).click();
    await page.getByLabel("Shotcaller / comp notes").fill("Wait for the caller before engaging.");
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Twenty player ZvZ roster" })).toBeVisible();
    const savedUrl = new URL(page.url());
    expect(savedUrl.searchParams.get("region")).toBe("europe");
    const id = savedUrl.pathname.split("/").pop()!;
    let stored = await (await context.request.get(`/api/compositions/${id}`)).json();
    expect(stored.slots).toHaveLength(20);
    expect(stored.slots[1].playerName).toBe("Caller One");
    expect(stored.slots[1].equipment[0].abilities.E).toBe("Blood Bandit");
    await page.reload();
    await expect(page.locator("[data-comp-member]")).toHaveCount(20);
    expect((await clients[3].request.get(`/api/compositions/${id}`)).status()).toBe(404);
    await page.getByRole("link", { name: "Edit comp", exact: true }).click();
    await page.getByText("Sharing, region & description", { exact: true }).click();
    await page.getByLabel("Comp visibility").selectOption("GROUP");
    await page.getByLabel("Shared team").selectOption(groupId);
    await page.getByRole("button", { name: "Save comp revision" }).click();
    await expect(page.getByRole("heading", { name: "Twenty player ZvZ roster" })).toBeVisible();
    stored = await (await context.request.get(`/api/compositions/${id}`)).json();
    expect((await clients[2].request.get(`/api/compositions/${id}`)).status()).toBe(200);
    expect((await clients[3].request.get(`/api/compositions/${id}`)).status()).toBe(404);
    const data = {
      title: stored.title,
      description: stored.description,
      region: stored.region,
      contentType: stored.contentType,
      visibility: stored.visibility,
      groupId: stored.groupId,
      notes: "Officer updated notes",
      slots: stored.slots,
    };
    expect(
      (
        await clients[2].request.put(`/api/compositions/${id}`, {
          headers: { origin: "http://localhost:3000" },
          data: { version: stored.version, composition: data },
        })
      ).status(),
    ).toBe(403);
    const edited = await clients[1].request.put(`/api/compositions/${id}`, {
      headers: { origin: "http://localhost:3000" },
      data: { version: stored.version, composition: data },
    });
    expect(edited.status()).toBe(200);
    expect(
      (
        await context.request.put(`/api/compositions/${id}`, {
          headers: { origin: "http://localhost:3000" },
          data: { version: stored.version, composition: data },
        })
      ).status(),
    ).toBe(409);
    await page.reload();
    await expect(page.getByText("Officer updated notes", { exact: true })).toBeVisible();
    await page.getByText("More actions", { exact: true }).click();
    await page.getByRole("button", { name: "Duplicate comp", exact: true }).click();
    await expect(page.getByLabel("Comp title")).toHaveValue("Twenty player ZvZ roster (copy)");
    await expect(page.getByLabel("Comp visibility")).toHaveValue("PRIVATE");
    const copyId = new URL(page.url()).pathname.split("/").at(-2)!;
    expect(copyId).not.toBe(id);
    const copy = await db.composition.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.authorId).toBe(ids[0]);
    await page.getByLabel("Comp title").fill("Independent public copy");
    await page.getByText("Sharing, region & description", { exact: true }).click();
    await page.getByLabel("Comp visibility").selectOption("PUBLIC");
    await page.getByRole("button", { name: "Save comp revision" }).click();
    await expect(page.getByRole("heading", { name: "Independent public copy" })).toBeVisible();
    expect((await clients[3].request.get(`/api/compositions/${copyId}`)).status()).toBe(200);
    expect((await db.composition.findUniqueOrThrow({ where: { id } })).title).toBe(
      "Twenty player ZvZ roster",
    );
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: ids[1] } } });
    expect((await clients[1].request.get(`/api/compositions/${id}`)).status()).toBe(404);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByText("More actions", { exact: true }).click();
    const menu = await page.locator("[data-comp-menu]").boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(320);
    await mkdir(".qa/player-polish", { recursive: true });
    await page.screenshot({ path: ".qa/player-polish/comp-menu-320.png", fullPage: false });
    await page.keyboard.press("Escape");
    await expect(page.getByText("More actions", { exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Export comp", exact: true })).toBeHidden();
    const download = page.waitForEvent("download");
    await page.getByText("More actions", { exact: true }).click();
    await page.getByRole("button", { name: "Export comp", exact: true }).click();
    const downloaded = await download;
    expect(downloaded.suggestedFilename()).toBe("albion-outpost-composition.json");
    const exportPath = await downloaded.path();
    expect(exportPath).not.toBeNull();
    await page.goto("/compositions/new");
    await expect(page.getByLabel("Import comp file")).toBeEnabled();
    await page.getByLabel("Import comp file").setInputFiles(exportPath!);
    await expect(page.getByLabel("Comp title")).toHaveValue("Independent public copy");
    const exportedComp = JSON.parse(await readFile(exportPath!, "utf8"));
    expect(exportedComp.format).toBe("albion-outpost-composition");
    await page.getByLabel("Comp title").fill("Changed before legacy import");
    await page.getByLabel("Import comp file").setInputFiles({
      name: "atlas-composition.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...exportedComp, format: "albion-atlas-composition" })),
    });
    await expect(page.getByLabel("Comp title")).toHaveValue("Independent public copy");
    await expect(
      page.getByRole("list", { name: "Comp roster", exact: true }).getByRole("listitem"),
    ).toHaveCount(20);
    await expect(page.getByLabel("Comp visibility")).toHaveValue("PRIVATE");
    await page.setViewportSize({ width: 375, height: 844 });
    await mkdir(".qa/screenshots", { recursive: true });
    await page.screenshot({ path: ".qa/screenshots/composition-editor-375.png", fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(
      (
        await clients[3].request.delete(`/api/compositions/${copyId}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.delete(`/api/compositions/${copyId}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(204);
    expect(await db.compositionVersion.count({ where: { compositionId: copyId } })).toBe(0);
  } finally {
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    for (const client of clients.slice(1)) await client.close();
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
