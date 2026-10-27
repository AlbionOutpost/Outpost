import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("homepage correction captures a deterministic public fixture at review viewports", async ({
  page,
}) => {
  const { iteration } = JSON.parse(
    await readFile("docs/design-review/homepage/current-iteration.json", "utf8"),
  );
  const folder = `.qa/homepage-correction/${iteration}`;
  await mkdir(folder, { recursive: true });
  // Ordinary persisted records for this isolated local layout scenario; never seeded/deployed.
  // Reserved atlas-test-* users are excluded from the homepage and tested separately.
  const id = `homepage-review-${randomUUID()}`;
  const reservedId = `atlas-test-${randomUUID()}`;
  await db.user.create({ data: { id, name: "Visual QA fixture" } });
  await db.user.create({ data: { id: reservedId, name: "Reserved QA fixture" } });
  const names = [
    "Battleaxe / roaming",
    "Battleaxe / solo PvE",
    "Battleaxe / group PvE",
    "Battleaxe / small scale",
    "Battleaxe / arena",
  ];
  try {
    for (const [authorId, title, visibility, hiddenAt] of [
      [reservedId, "Reserved fixture must not appear", "PUBLIC", null],
      [id, "Private loadout must not appear", "PRIVATE", null],
      [id, "Moderated loadout must not appear", "PUBLIC", new Date()],
    ] as const) {
      await db.build.create({
        data: {
          authorId,
          title,
          visibility,
          hiddenAt,
          description: "QA only",
          contentType: "Roaming",
          region: "europe",
          strategy: "",
          patchNotes: "",
          updatedAt: new Date("2099-01-01T00:00:00Z"),
        },
      });
    }
    for (let i = 0; i < 5; i++)
      await db.build.create({
        data: {
          authorId: id,
          title: names[i],
          description: "Isolated visual QA fixture, not a community recommendation.",
          contentType: ["Roaming", "Solo PvE", "Group PvE", "Small Scale PvP", "Arena"][i],
          visibility: "PUBLIC",
          region: "europe",
          strategy: "",
          patchNotes: "",
          updatedAt: new Date(`2050-01-0${5 - i}T00:00:00Z`),
          equipment: {
            create: [
              {
                slot: "Main hand",
                itemId: `T${4 + i}_MAIN_AXE`,
                quality: 1,
                abilities: "",
                alternatives: "",
              },
              {
                slot: "Helmet",
                itemId: "T4_HEAD_CLOTH_SET1",
                quality: 1,
                abilities: "",
                alternatives: "",
              },
              {
                slot: "Chest",
                itemId: "T4_ARMOR_LEATHER_SET1",
                quality: 1,
                abilities: "",
                alternatives: "",
              },
              {
                slot: "Boots",
                itemId: "T4_SHOES_LEATHER_SET1",
                quality: 1,
                abilities: "",
                alternatives: "",
              },
              ...[
                ["Cape", "T4_CAPE"],
                ["Food", "T7_MEAL_OMELETTE"],
                ["Potion", "T4_POTION_HEAL"],
              ].map(([slot, itemId]) => ({
                slot,
                itemId,
                quality: 1,
                abilities: "",
                alternatives: "",
              })),
            ],
          },
        },
      });
    const rows = [];
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/?region=europe");
      await page.locator("main h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("link", { name: "Explore market", exact: true })).toHaveAttribute(
        "href",
        "/tools/market?region=europe",
      );
      await expect(page.getByRole("link", { name: "Create a build", exact: true })).toHaveAttribute(
        "href",
        "/builds/new?region=europe",
      );
      await expect(page.locator(".featured-tool")).toHaveCount(4);
      await expect(page.locator("main")).toContainText("Battleaxe / roaming");
      const community = page.locator(".home-community-builds");
      await expect(community).not.toContainText("Reserved fixture must not appear");
      await expect(community).not.toContainText("Private loadout must not appear");
      await expect(community).not.toContainText("Moderated loadout must not appear");
      const first = community
        .locator(".homepage-build-tile")
        .filter({ has: page.getByRole("heading", { name: "Battleaxe / roaming", exact: true }) });
      await expect(first.locator("img[data-albion-icon]")).toHaveCount(7);
      for (const slot of ["Helmet", "Chest", "Boots", "Cape", "Food", "Potion"])
        await expect(first.getByLabel(new RegExp(`^${slot}:`))).toBeVisible();
      await expect(first.getByLabel(/^Food:/).locator("img")).toHaveAttribute(
        "src",
        /T7_MEAL_OMELETTE/,
      );
      await expect(first.getByLabel(/^Potion:/).locator("img")).toHaveAttribute(
        "src",
        /T4_POTION_HEAL/,
      );
      // Trigger native lazy loading by visiting the actual lower page regions.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        window.scrollTo(0, 0);
      });
      await page
        .waitForFunction(
          () =>
            Array.from(
              document.querySelectorAll<HTMLImageElement>("main img[data-albion-icon]"),
            ).every((img) => img.complete && img.naturalWidth > 0),
          {},
          { timeout: 8000 },
        )
        .catch(() => undefined);
      const artwork = await page.locator("main img[data-albion-icon]").evaluateAll((images) =>
        images.map((node) => {
          const img = node as HTMLImageElement;
          return {
            source: img.currentSrc || img.src,
            complete: img.complete,
            width: img.naturalWidth,
            delivery: (img.currentSrc || img.src).includes("render.albiononline.com")
              ? "official-renderer"
              : "bounded-fallback",
          };
        }),
      );
      await writeFile(`${folder}/artwork-${width}.json`, JSON.stringify(artwork, null, 2));
      await page.locator("main h1").click();
      await page.evaluate(() => {
        const note = document.createElement("div");
        note.textContent = "LOCAL QA · isolated layout records";
        Object.assign(note.style, {
          position: "fixed",
          top: "2px",
          right: "8px",
          zIndex: "9999",
          padding: "2px 5px",
          background: "#101014",
          color: "#eee",
          font: "11px sans-serif",
        });
        document.body.append(note);
      });
      await page.screenshot({ path: `${folder}/home-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${folder}/viewport-${width}.png`, fullPage: false });
      const geometry = await page.evaluate(() => {
        const box = (selector: string) => {
          const e = document.querySelector(selector);
          if (!e) return null;
          const b = e.getBoundingClientRect();
          return {
            x: Math.round(b.x),
            y: Math.round(b.y),
            width: Math.round(b.width),
            height: Math.round(b.height),
          };
        };
        return {
          header: box(".site-header"),
          hero: box(".outpost-hero"),
          headline: box(".outpost-hero h1"),
          features: box(".featured-tools"),
          community: box(".home-community-builds"),
          market: box(".market-desk"),
          overflow: document.documentElement.scrollWidth > innerWidth,
          headlineFont: getComputedStyle(document.querySelector("main h1")!).fontFamily,
        };
      });
      expect(geometry.overflow).toBe(false);
      if (!iteration.startsWith("00")) {
        await expect(page.locator(".featured-tool img[data-albion-icon]")).toHaveCount(0);
        await expect(page.locator(".featured-tool .feature-emblem")).toHaveCount(4);
        expect(await page.locator(".featured-tool h2").allTextContents()).toEqual([
          "Market tools",
          "Build creator",
          "Calculators",
          "Guild tools",
        ]);
        expect(geometry.market!.y).toBeLessThan(geometry.community!.y);
      }
      if (!iteration.startsWith("00") && !iteration.startsWith("01")) {
        await expect(page.locator(".hero-scene")).toHaveCount(0);
        await expect(page.locator(".equipment-showcase")).toHaveCount(1);
        if (width === 1440) {
          const preview = await page.locator(".equipment-showcase").boundingBox();
          expect(preview!.width).toBeGreaterThan(300);
          expect(geometry.hero!.height).toBeGreaterThanOrEqual(340);
          expect(geometry.hero!.height).toBeLessThanOrEqual(850);
          expect(geometry.market!.y).toBeLessThan(1150);
        } else {
          await expect(page.locator(".equipment-showcase")).toBeVisible();
        }
      }
      rows.push({ width, height, ...geometry });
    }
    await page
      .locator(".homepage-build-tile")
      .filter({ has: page.getByRole("heading", { name: "Battleaxe / roaming", exact: true }) })
      .click();
    await expect(
      page.getByRole("heading", { name: "Battleaxe / roaming", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/builds\//);
    await writeFile(
      `${folder}/measurements.json`,
      JSON.stringify(
        {
          fixture:
            "Five original Battleaxe QA loadouts; author Visual QA fixture; future sort dates isolate screenshots from concurrent tests; never deployed data.",
          rows,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.user.deleteMany({ where: { id: { in: [id, reservedId] } } });
  }
});
test.afterAll(() => db.$disconnect());
