import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("full sets persist in builds, copy into comps independently, and retain private access", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Equipment set QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const other = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
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
    await page.goto("/builds/new");
    await page.getByLabel("Build title", { exact: true }).fill("Complete equipment set fixture");
    const tools = page.getByRole("region", { name: "Equipment sets and templates" });
    await tools.locator("summary").click();
    await page.getByRole("button", { name: "Apply template", exact: true }).click();
    await expect(page.locator(".character-slot.equipped")).toHaveCount(10);
    await page.getByLabel("Main hand Q", { exact: true }).selectOption("Rending Spin");
    await page.getByLabel("Main hand alternative", { exact: true }).selectOption("T5_MAIN_AXE");
    await page.getByLabel("Spare set name", { exact: true }).fill("Boss swap");
    await page.getByRole("button", { name: "Save active as spare set", exact: true }).click();
    await expect(tools).toContainText("Boss swap");
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Complete equipment set fixture", exact: true }),
    ).toBeVisible();
    const buildId = page.url().split("/").pop()!;
    const saved = await db.build.findUniqueOrThrow({
      where: { id: buildId },
      include: { equipment: true },
    });
    expect(saved.equipment).toHaveLength(10);
    expect(
      (
        saved.equipmentSets as {
          equipment: { slot: string; abilities: Record<string, string>; alternatives: string[] }[];
        }[]
      )[0].equipment.find((e) => e.slot === "Main hand"),
    ).toMatchObject({ abilities: { Q: "Rending Spin" }, alternatives: ["T5_MAIN_AXE"] });
    expect(saved.equipmentSets as unknown[]).toHaveLength(1);
    expect((await other.request.get(`/api/builds/${buildId}`)).status()).toBe(404);
    expect((await other.request.get(`/api/compositions/loadout?id=${buildId}`)).status()).toBe(401);
    await page.reload();
    await expect(page.getByRole("region", { name: "Saved spare equipment sets" })).toContainText(
      "Boss swap",
    );
    await page.getByRole("link", { name: "Edit build", exact: true }).click();
    await page
      .getByRole("region", { name: "Equipment sets and templates" })
      .locator("summary")
      .click();
    await expect(
      page.getByRole("button", { name: "Apply Boss swap set", exact: true }),
    ).toBeVisible();
    await page.goto("/compositions/new");
    await page.getByRole("button", { name: "Solo", exact: true }).click();
    await page.getByLabel("Copy loadout from build", { exact: true }).selectOption(buildId);
    const dialog = page.getByRole("dialog", { name: "Edit member 1", exact: true });
    await expect(dialog).toContainText("1/5 saved");
    const compTools = dialog.getByRole("region", { name: "Equipment sets and templates" });
    await compTools.locator("summary").click();
    await page.getByLabel("Spare set name", { exact: true }).fill("Substitute set");
    await page.getByRole("button", { name: "Save active as spare set", exact: true }).click();
    await page.getByLabel("Substitute", { exact: true }).fill("Reserve player");
    await page.getByRole("button", { name: "Close Edit member 1", exact: true }).click();
    await page.getByLabel("Comp title", { exact: true }).fill("Comp equipment snapshots");
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Comp equipment snapshots", exact: true }),
    ).toBeVisible();
    const compId = page.url().split("/").pop()!;
    const comp = await db.composition.findUniqueOrThrow({ where: { id: compId } });
    expect((comp.slots as { equipmentSets: unknown[] }[])[0].equipmentSets).toHaveLength(2);
    expect((await db.build.findUniqueOrThrow({ where: { id: buildId } })).equipmentSets).toEqual(
      saved.equipmentSets,
    );
    await page.goto(`/builds/${buildId}/edit`);
    await page
      .getByRole("region", { name: "Equipment sets and templates" })
      .locator("summary")
      .click();
    await mkdir(".qa/product-next/equipment", { recursive: true });
    for (const width of [1920, 1440, 768, 390, 375, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({
        path: `.qa/product-next/equipment/build-${width}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    }
  } finally {
    await other.close();
    await db.user.delete({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
