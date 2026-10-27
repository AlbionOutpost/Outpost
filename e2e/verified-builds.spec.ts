import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("verified equipment and ability choices persist, copy into comps and restore independently", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Verified build author",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
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
    await page.getByLabel("Build title").fill("Verified ability loadout");

    await page.getByLabel("Main hand equipment").selectOption("MAIN_AXE");
    await page.getByLabel("Main hand tier").selectOption("6");
    await page.getByLabel("Main hand E", { exact: true }).selectOption("Blood Bandit");
    await page.getByLabel("Main hand Passive", { exact: true }).selectOption("Deep Cuts");
    await page.getByLabel("Main hand alternative").selectOption("T5_MAIN_AXE");
    await page.getByRole("button", { name: /^Select Food slot\b/ }).click();
    await page.getByLabel("Browse tier", { exact: true }).selectOption("8");
    await page.getByRole("button", { name: /^Equip Beef Stew\b/ }).click();
    await page.getByRole("button", { name: /^Select Potion slot\b/ }).click();
    await page.getByLabel("Browse tier", { exact: true }).selectOption("4");
    await page.getByRole("button", { name: /^Equip Healing Potion\b/ }).click();
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verified ability loadout" })).toBeVisible();
    const buildId = page.url().split("/").pop()!;
    await page.reload();
    await expect(page.getByText(/Recorded selections:.*Blood Bandit/)).toBeVisible();
    const equipment = await db.buildEquipment.findFirstOrThrow({
      where: { buildId, slot: "Main hand" },
    });
    expect(
      (await db.buildEquipment.findFirstOrThrow({ where: { buildId, slot: "Food" } })).itemId,
    ).toBe("T8_MEAL_STEW");
    expect(
      (await db.buildEquipment.findFirstOrThrow({ where: { buildId, slot: "Potion" } })).itemId,
    ).toBe("T4_POTION_HEAL");
    expect(equipment.abilitySelections).toEqual({ E: "Blood Bandit", Passive: "Deep Cuts" });
    expect(equipment.alternativeItemIds).toEqual(["T5_MAIN_AXE"]);
    await page.getByRole("link", { name: "Edit build", exact: true }).click();
    await page.getByLabel("Build title").fill("Revised verified loadout");
    await page.getByLabel("Build visibility").selectOption("PUBLIC");
    await page.getByRole("button", { name: "Save new revision" }).click();
    await expect(page.getByRole("heading", { name: "Revised verified loadout" })).toBeVisible();
    await page.getByLabel("Revision to restore").selectOption("1");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Restore as new revision" }).click();
    await expect(page.getByRole("heading", { name: "Verified ability loadout" })).toBeVisible();
    const restored = await db.build.findUniqueOrThrow({ where: { id: buildId } });
    expect(restored.version).toBe(3);
    expect(restored.visibility).toBe("PUBLIC");
    expect(await db.buildVersion.count({ where: { buildId } })).toBe(3);
    await page.getByRole("button", { name: "Duplicate build", exact: true }).click();
    await expect(page.getByLabel("Build title")).toHaveValue("Verified ability loadout (copy)");
    const duplicateId = page.url().split("/").at(-2)!;
    expect(duplicateId).not.toBe(buildId);
    expect((await db.build.findUniqueOrThrow({ where: { id: duplicateId } })).visibility).toBe(
      "PRIVATE",
    );
    await page.goto("/compositions/new");
    await page.getByLabel("Comp title").fill("Build snapshot test comp");
    await page.getByRole("button", { name: "Solo", exact: true }).click();
    await page.getByLabel("Copy loadout from build").selectOption(buildId);
    await expect(page.getByLabel("Main hand E", { exact: true })).toHaveValue("Blood Bandit");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Build snapshot test comp" })).toBeVisible();
    await page.getByLabel("Comp display").selectOption("detailed");
    await expect(page.getByText(/E: Blood Bandit/)).toBeVisible();
    const bad = await context.request.post("/api/builds", {
      headers: { origin: "http://localhost:3000" },
      data: {
        title: "Rejected ability",
        description: "",
        contentType: "Other",
        region: "europe",
        visibility: "PRIVATE",
        playerCount: 1,
        recommendedIP: 0,
        strategy: "",
        patchNotes: "",
        equipment: [
          {
            slot: "Main hand",
            itemId: "T6_MAIN_AXE",
            quality: 1,
            abilities: "",
            alternatives: "",
            abilitySelections: { E: "Invented spell" },
            alternativeItemIds: [],
          },
        ],
      },
    });
    expect(bad.status()).toBe(400);
  } finally {
    await db.user.delete({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
