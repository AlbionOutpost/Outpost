import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("five-player board edits, persists, reloads and exports a real PNG", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await mkdir(".qa/reference-review", { recursive: true });
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  let compositionId = "";
  await db.user.create({
    data: {
      id,
      name: "Reference UI reviewer",
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
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/compositions/new");
    await page.getByLabel("Comp title", { exact: true }).fill("Five-player reference review");
    await page.getByRole("button", { name: "5 players", exact: true }).click();
    await expect(page.getByRole("region", { name: "Visual party loadouts" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit player \d loadout/ })).toHaveCount(5);
    await page.getByRole("button", { name: /^Edit player 1 loadout\b/ }).click();
    await page.getByLabel("Player name", { exact: true }).fill("First caller");
    await page.getByLabel("Member role").selectOption("Tank");
    await page.getByRole("button", { name: /^Select Main hand slot\b/ }).click();
    await page.getByRole("button", { name: /^Equip Battleaxe\b/ }).click();
    await page.getByLabel("Main hand E", { exact: true }).selectOption("Blood Bandit");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Edit player 1 loadout\b/ })).toContainText(
      "First caller",
    );
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Five-player reference review", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/compositions\/(?!new$)[^/]+$/);
    compositionId = page.url().split("/").pop()!;
    await page.reload();
    await expect(page.getByRole("region", { name: "Visual party loadouts" })).toContainText(
      "First caller",
    );
    await mkdir(".qa/reference-review", { recursive: true });
    await page.locator("main h1").click();
    await page.screenshot({
      path: ".qa/reference-review/five-player-board-1440.png",
      fullPage: true,
    });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^outpost-.*\.png$/);
    await download.saveAs(".qa/reference-review/composition-export.png");
    const bytes = await readFile(".qa/reference-review/composition-export.png");
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(1000);
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(400);
    await page.getByLabel("PNG size", { exact: true }).selectOption("1080");
    const wideDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG", exact: true }).click();
    await (await wideDownload).saveAs(".qa/reference-review/composition-export-1080.png");
    const wideBytes = await readFile(".qa/reference-review/composition-export-1080.png");
    expect(wideBytes.readUInt32BE(16)).toBe(1920);
    expect(wideBytes.readUInt32BE(20)).toBe(1080);
    expect((await db.composition.findUniqueOrThrow({ where: { id: compositionId } })).title).toBe(
      "Five-player reference review",
    );
    await page.setViewportSize({ width: 375, height: 844 });
    await page.screenshot({
      path: ".qa/reference-review/five-player-board-375.png",
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  } finally {
    if (compositionId) await db.composition.deleteMany({ where: { id: compositionId } });
    await db.user.deleteMany({ where: { id } });
  }
});

test("community discovery filters real equipment without exposing private builds", async ({
  page,
}) => {
  await mkdir(".qa/reference-review", { recursive: true });
  const id = `atlas-test-${randomUUID()}`,
    tag = randomUUID().slice(0, 8);
  await db.user.create({ data: { id, name: "Discovery reviewer" } });
  const make = (
    title: string,
    visibility: "PUBLIC" | "PRIVATE",
    contentType: string,
    itemId: string,
  ) =>
    db.build.create({
      data: {
        authorId: id,
        title: `${tag} ${title}`,
        description: "Temporary discovery fixture",
        region: "europe",
        contentType,
        visibility,
        strategy: "",
        patchNotes: "",
        equipment: {
          create: { slot: "Main hand", itemId, quality: 1, abilities: "", alternatives: "" },
        },
      },
    });
  try {
    await make("Arena axe", "PUBLIC", "Arena", "T6_MAIN_AXE");
    await make("Solo bow", "PUBLIC", "Solo Mists", "T4_2H_BOW");
    await make("Private arena axe", "PRIVATE", "Arena", "T6_MAIN_AXE");
    await page.goto(`/builds?q=${tag}`);
    await expect(page.locator(".build-preview-card")).toHaveCount(2);
    await page.getByLabel("Filter build content").selectOption("Arena");
    await page.getByLabel("Filter build weapon").selectOption("MAIN_AXE");
    await page.getByRole("button", { name: "Search builds", exact: true }).click();
    await expect(page.locator(".build-preview-card")).toHaveCount(1);
    await expect(page.locator(".build-preview-card")).toContainText("Arena axe");
    await expect(page.locator(".build-preview-card")).not.toContainText("Private arena");
    await expect(page.locator(".build-preview-card img[data-albion-icon]").first()).toBeVisible();
    await page.screenshot({ path: ".qa/reference-review/build-browser-1440.png", fullPage: true });
    await page.setViewportSize({ width: 375, height: 844 });
    await expect(page.getByLabel("Filter build content")).not.toBeVisible();
    const mobileFilters = page.getByRole("button", { name: "Filter builds", exact: true });
    await mobileFilters.click();
    await expect(mobileFilters).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Filter build content")).toBeVisible();
    await page.getByLabel("Filter build weapon").selectOption("2H_BOW");
    await page.getByRole("button", { name: "Search builds", exact: true }).click();
    await expect(page.locator(".build-preview-card")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "No matching loadouts", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: ".qa/reference-review/build-browser-375.png", fullPage: true });
    await page.goto("/guides");
    await page.getByLabel("Search guides").fill("return assumptions");
    await expect(page.locator(".guide-discovery-card")).toHaveCount(1);
    await page.getByText("Read guide", { exact: true }).click();
    await expect(page.locator(".guide-body")).toContainText("Production tools");
    await page.getByLabel("Search guides").fill("unmatched topic xyz");
    await expect(page.getByText("No guide matches this search. Try another topic.")).toBeVisible();
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
