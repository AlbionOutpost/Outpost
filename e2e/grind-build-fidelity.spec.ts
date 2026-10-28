import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("archived traits, alternate spells and creator links survive an independent regional guest copy", async ({
  page,
}) => {
  await page.goto("/builds/library/battleaxe-mist-build?region=asia");
  await expect(
    page.getByLabel("Helmet alternative recorded abilities", { exact: true }),
  ).toContainText("Purge");
  const traits = page.getByRole("region", {
    name: "Recorded awakening recommendations",
    exact: true,
  });
  await expect(traits.getByRole("heading", { name: "Cooldown Rate", exact: true })).toBeVisible();
  await expect(traits.getByRole("heading", { name: "Ability Damage", exact: true })).toBeVisible();
  await expect(traits.getByRole("heading", { name: "Defense vs. All", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Recorded build video 1/ })).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=vtDHrCPH6c4",
  );
  await expect(
    page.getByRole("link", { name: "Compare prices →", exact: true }).first(),
  ).toHaveAttribute("href", /region=asia/);
  await page.getByRole("link", { name: "Make this build yours", exact: true }).click();
  await page.getByText("Build settings & description", { exact: true }).click();
  await expect(page.getByLabel("Build region", { exact: true })).toHaveValue("asia");
  await page.locator(".equipment-set-tools summary").click();
  await expect(page.locator(".saved-equipment-sets > article")).toHaveCount(3);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /^Apply Helmet swap/ }).click();
  await expect(page.getByLabel("Helmet Active", { exact: true })).toHaveValue("Purge");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guest draft saved" })).toBeVisible();
  await page.goto("/builds/new");
  await expect(page.getByLabel("Helmet Active", { exact: true })).toHaveValue("Purge");
  await page.getByText("Import & export", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export build JSON", exact: true }).click();
  const path = await (await download).path();
  const saved = JSON.parse(readFileSync(path!, "utf8"));
  expect(saved.region).toBe("asia");
  expect(saved.equipmentSets).toHaveLength(3);
  expect(saved.strategy).toContain("Archived awakening recommendations: cooldown-rate");
  expect(saved.strategy).toContain("https://www.youtube.com/watch?v=vtDHrCPH6c4");
  expect(saved.equipment.find((e: { slot: string }) => e.slot === "Helmet").itemId).toBe(
    "T8_HEAD_CLOTH_HELL",
  );
});

test("archived alternative spell sets save behind normal account ownership and stay private", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  const outsider = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await db.user.create({
      data: {
        id,
        name: "Archive copy ownership fixture",
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
    await page.goto("/builds/new?from=battleaxe-mist-build&region=asia");
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(page).toHaveURL(/\/builds\/[a-z0-9]+$/);
    const buildId = page.url().split("/").pop()!;
    const saved = await db.build.findUniqueOrThrow({ where: { id: buildId } });
    expect(saved.authorId).toBe(id);
    expect(saved.visibility).toBe("PRIVATE");
    expect(saved.region).toBe("asia");
    expect(saved.equipmentSets).toHaveLength(3);
    expect((await outsider.request.get(`/api/builds/${buildId}`)).status()).toBe(404);
    await page.getByRole("link", { name: "Edit build", exact: true }).click();
    await page.locator(".equipment-set-tools summary").click();
    await expect(page.locator(".saved-equipment-sets > article")).toHaveCount(3);
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id } });
  }
});

test("archive metadata and gear details remain readable at all six widths", async ({ page }) => {
  await page.goto("/builds/library/battleaxe-mist-build");
  for (const width of [320, 375, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Build detail at${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test.afterAll(() => db.$disconnect());
