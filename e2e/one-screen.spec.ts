import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";

/**
 * Tool and workspace pages fit one screen at 1440×900 (DESIGN.md "Inner pages fit one screen"):
 * the page's own content ends within the first viewport; only a calculator's server-rendered
 * "How it works" block and the site footer are below it.
 * Market prices, history and scans answer with nothing so every page is in a stable state.
 */
const db = createTestDb();
const viewport = { width: 1440, height: 900 };

async function contentBottom(page: Page) {
  // Let late panels (prices, scans) settle before measuring.
  await page.waitForLoadState("networkidle");
  return page.evaluate(() => {
    scrollTo(0, 0);
    const main = document.querySelector("main")!;
    return Math.max(
      ...[...main.children]
        .filter((el) => !el.hasAttribute("data-how-it-works"))
        .map((el) => el.getBoundingClientRect().bottom),
    );
  });
}

async function quietMarket(page: Page) {
  await page.route("**/api/economy/prices?**", (route) => route.fulfill({ json: { prices: {} } }));
  await page.route("**/api/history?**", (route) =>
    route.fulfill({ status: 503, json: { error: "Upstream unavailable" } }),
  );
  for (const scan of ["economy/crafts", "economy/black-market"])
    await page.route(`**/api/${scan}?**`, (route) =>
      route.fulfill({ status: 503, json: { error: "Upstream unavailable" } }),
    );
  await page.route("**/api/opportunities?**", (route) =>
    route.fulfill({ status: 503, json: { error: "Upstream unavailable" } }),
  );
}

const toolPages = [
  "/tools",
  "/tools/crafting",
  "/tools/refining",
  "/tools/enchanting",
  "/tools/cooking",
  "/tools/alchemy",
  "/tools/farming",
  "/tools/fishing",
  "/tools/flipping",
  "/tools/black-market",
  "/tools/profitable-crafts",
  "/tools/transporting",
  "/tools/laborers",
  "/tools/mastery",
  "/tools/reference",
  "/tools/avalon-mapper",
  "/tools/gold",
];

test("tool pages end within the first screen at 1440x900", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize(viewport);
  await quietMarket(page);
  for (const path of toolPages) {
    await page.goto(`${path}?region=europe`);
    expect(await contentBottom(page), path).toBeLessThanOrEqual(viewport.height);
  }
  // Gold with a week of observations: figures, chart and the closing row still fit.
  await page.unroute("**/api/history?**");
  await page.route("**/api/history?**", (route) =>
    route.fulfill({
      json: {
        data: Array.from({ length: 48 }, (_, i) => ({
          price: 4800 + (i % 7) * 25,
          timestamp: new Date(Date.UTC(2026, 9, 25) + i * 3600e3).toISOString(),
        })),
      },
    }),
  );
  await page.goto("/tools/gold?region=europe");
  await expect(page.locator(".history-chart")).toBeVisible();
  expect(await contentBottom(page), "gold with history").toBeLessThanOrEqual(viewport.height);
  // A complete crafting run (its Run details closed) still fits.
  await page.goto("/tools/crafting?region=europe");
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
  await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
  await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
  await expect(page.getByRole("button", { name: "Run details", exact: true })).toBeVisible();
  expect(await contentBottom(page), "complete crafting run").toBeLessThanOrEqual(viewport.height);
  // Flipping: the hand check is the second tab, and fits too.
  await page.goto("/tools/flipping?region=europe");
  await page.getByRole("tab", { name: "Check one trade", exact: true }).click();
  await expect(page.getByLabel("Purchase price per item", { exact: true })).toBeVisible();
  expect(await contentBottom(page), "flipping hand check").toBeLessThanOrEqual(viewport.height);
});

test("editors and the admin console end within the first screen at 1440x900", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "One screen QA",
      role: "ADMIN",
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
    const equipment = [
      ["Main hand", "T6_MAIN_AXE@1"],
      ["Helmet", "T6_HEAD_CLOTH_SET1"],
      ["Chest", "T6_ARMOR_LEATHER_SET1"],
      ["Boots", "T6_SHOES_LEATHER_SET1"],
      ["Cape", "T6_CAPE"],
    ].map(([slot, itemId]) => ({ slot, itemId, quality: 1, abilities: {}, alternatives: [] }));
    const comp = await db.composition.create({
      data: {
        authorId: id,
        title: "Ten player one-screen fixture",
        description: "Layout fixture, not a recommended comp.",
        region: "europe",
        contentType: "ZvZ",
        visibility: "PRIVATE",
        notes: "",
        slots: Array.from({ length: 10 }, (_, i) => ({
          id: randomUUID(),
          role: ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Support"][i % 5],
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
    const build = await db.build.create({
      data: {
        authorId: id,
        title: "One screen fixture build",
        description: "Layout fixture.",
        contentType: "Solo Mists",
        region: "europe",
        visibility: "PRIVATE",
        strategy: "",
        patchNotes: "",
        equipment: {
          create: {
            slot: "Main hand",
            itemId: "T6_MAIN_AXE@1",
            quality: 1,
            abilities: "",
            alternatives: "",
          },
        },
      },
    });
    await page.setViewportSize(viewport);
    for (const path of [
      "/builds/new",
      `/builds/${build.id}/edit`,
      "/compositions/new",
      `/compositions/${comp.id}/edit`,
      "/admin",
    ]) {
      await page.goto(path);
      expect(await contentBottom(page), path).toBeLessThanOrEqual(viewport.height);
    }
    // The ten-member party scrolls inside its own well rather than the page.
    await page.goto(`/compositions/${comp.id}/edit`);
    await expect(page.locator("[data-member-index]")).toHaveCount(10);
    await expect
      .poll(() =>
        page
          .locator("[data-member-index]")
          .first()
          .evaluate((row) => {
            for (let el = row.parentElement; el && el !== document.body; el = el.parentElement)
              if (
                getComputedStyle(el).overflowY === "auto" &&
                el.scrollHeight > el.clientHeight + 1
              )
                return true;
            return false;
          }),
      )
      .toBe(true);
  } finally {
    await db.composition.deleteMany({ where: { authorId: id } });
    await db.build.deleteMany({ where: { authorId: id } });
    await db.user.delete({ where: { id } });
  }
});
