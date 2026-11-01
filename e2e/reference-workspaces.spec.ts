import { selectEditorSlot } from "./support/build-editor";
import { chooseRegion } from "./support/region";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";

const db = createTestDb();

test("market city comparison selects details, removes city chips and invalidates prices across regions", async ({
  page,
}) => {
  const observed = new Date().toISOString();
  await page.route("**/api/market?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        prices: ["Bridgewatch", "Lymhurst", "Caerleon"].map((city, index) => ({
          item_id: "T4_BAG",
          quality: 1,
          city,
          sell_price_min: 1200 + index * 100,
          buy_price_max: index === 1 ? 0 : 1000,
          sell_price_min_date: observed,
          buy_price_max_date: observed,
        })),
      },
    }),
  );
  await page.goto("/tools/market?region=europe");
  await expect(page.locator(".market-board tbody tr")).toHaveCount(3);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByRole("button", { name: "Lymhurst market details", exact: true }).click();
  await expect(page.locator(".reference-city-summary")).toContainText("1,300");
  await expect(page.locator(".reference-city-summary")).toContainText("Not observed");
  await expect(page.locator(".reference-city-summary")).toContainText("No observation");
  const priceBounds = await page.locator(".reference-city-summary .numeric").first().boundingBox();
  expect(priceBounds!.height).toBeLessThan(40);
  expect(priceBounds!.width).toBeGreaterThanOrEqual(40);
  await page.locator(".reference-city-filter summary").click();
  await page.getByLabel("Bridgewatch", { exact: true }).check();
  await page.getByLabel("Caerleon", { exact: true }).check();
  await expect(page.locator(".market-board tbody tr")).toHaveCount(2);
  await expect(page.locator(".reference-city-summary")).toHaveCount(0);
  await page.getByRole("button", { name: "Remove Bridgewatch filter", exact: true }).click();
  await expect(page.locator(".market-board tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator(".market-board tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Hide price history", exact: true }).click();
  await expect(page.locator(".reference-market-history .history-panel")).toHaveCount(0);
  await chooseRegion(page, "asia");
  await expect(page.locator(".market-board tbody tr")).toHaveCount(0);
  await expect(page.locator(".reference-city-summary")).toHaveCount(0);
});

test("equipment drawer contains keyboard focus and returns to the selected equipment slot", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  try {
    await db.user.create({
      data: {
        id,
        name: "Drawer QA fixture",
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/builds/new");
    await selectEditorSlot(page, "Helmet");
    const trigger = page.getByRole("button", { name: "Choose Helmet equipment", exact: false });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Equipment picker", exact: true });
    await expect(drawer).toBeVisible();
    await expect(page.getByLabel("Search equipment")).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("button", { name: /^Equip Scholar Cowl\b/ }).click();
    await expect(drawer).not.toBeVisible();
    await page.getByText("Exact equipment selection", { exact: true }).click();
    await expect(page.getByLabel("Helmet equipment", { exact: true })).toHaveValue(
      "HEAD_CLOTH_SET1",
    );
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});

test.afterAll(() => db.$disconnect());
