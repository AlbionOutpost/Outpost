import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
import { mkdir } from "node:fs/promises";

test("mobile equipment selection and member dialog support keyboard editing", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Mobile workflow reviewer",
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
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto("/builds/new");
    await page.getByRole("button", { name: /^Select Helmet slot\b/ }).click();
    await expect(page.getByLabel("Search equipment")).toBeVisible();
    await page.getByRole("button", { name: /^Equip Scholar Cowl\b/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Helmet equipment")).toBeVisible();
    await page.getByLabel("Helmet Active").selectOption("Energy Shield");
    await page.getByRole("button", { name: "Equipment", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Select Helmet slot\b/ })).toContainText(
      "Scholar Cowl",
    );
    await mkdir(".qa/player-workflows", { recursive: true });
    await page.screenshot({ path: ".qa/player-workflows/build-equipment-375.png", fullPage: true });
    await page.goto("/compositions/new");
    await page.getByRole("button", { name: "20 players", exact: true }).click();
    await expect(page.getByRole("listitem")).toHaveCount(20);
    const trigger = page.getByRole("button", { name: /^Configure member 1\b/ });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.getByLabel("Player name", { exact: true }).fill("Mobile caller");
    await page.getByRole("button", { name: /^Select Main hand slot\b/ }).click();
    await page.getByRole("button", { name: /^Equip Battleaxe\b/ }).click();
    await page.getByLabel("Main hand E", { exact: true }).selectOption("Blood Bandit");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(375);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: ".qa/player-workflows/member-editor-375.png", fullPage: false });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("listitem").first()).toContainText("Mobile caller");
    const handle = page.getByRole("button", { name: "Drag member 1", exact: true });
    await handle.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listitem").nth(1)).toContainText("Mobile caller");
    await page.getByRole("button", { name: /^Configure member 2\b/ }).click();
    await expect(page.getByLabel("Player name", { exact: true })).toHaveValue("Mobile caller");
    await page.getByRole("button", { name: "Item details", exact: true }).click();
    await expect(page.getByLabel("Main hand E", { exact: true })).toHaveValue("Blood Bandit");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});

test("market item names can be selected with the keyboard", async ({ page }) => {
  await page.goto("/tools/market?region=asia");
  const input = page.getByRole("combobox", { name: "Search market items" });
  await input.fill("Battleaxe");
  await expect(
    page.getByRole("listbox", { name: "Matching market items" }).getByRole("option").first(),
  ).toContainText("Battleaxe");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".market-selected-item")).toContainText("Battleaxe");
  await expect(page.getByLabel("Albion region")).toHaveValue("asia");
  await input.fill("no matching equipment xxxxx");
  await expect(page.getByText("No matching items. Adjust the name or filters.")).toBeVisible();
  await input.press("Escape");
  await expect(input).toHaveAttribute("aria-expanded", "false");
});

test.afterAll(() => db.$disconnect());
