import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("design review covers application pages, equipment, guilds and reduced motion", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Atlas reviewer",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const group = await db.group.create({
    data: {
      name: "Atlas review guild",
      slug: randomUUID(),
      description: "Private planning space · temporary QA fixture",
      region: "europe",
      ownerId: id,
      members: { create: { userId: id, role: "OWNER" } },
    },
  });
  await db.groupEvent.create({
    data: {
      groupId: group.id,
      title: "Guild gathering · QA fixture",
      description: "Temporary schedule review, removed after the test.",
      startsAt: new Date(Date.now() + 86400000),
      timezone: "Europe/Berlin",
      expectedParticipants: 20,
      voiceInfo: "Guild voice",
      authorId: id,
    },
  });
  // Controlled observations are browser-test fixtures only; no example prices ship in the UI.
  await page.route("**/api/market?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        prices: ["Bridgewatch", "Caerleon", "Lymhurst"].map((city, i) => ({
          item_id: "T4_BAG",
          quality: 1,
          city,
          sell_price_min: 1200 + i * 100,
          buy_price_max: 1000 + i * 100,
          sell_price_min_date: new Date().toISOString(),
          buy_price_max_date: new Date().toISOString(),
        })),
      },
    }),
  );
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
  await mkdir(".qa/design-review", { recursive: true });
  const rows = [];
  try {
    for (const theme of ["dark", "light"]) {
      await context.addCookies([
        { name: "atlas-theme", value: theme, domain: "localhost", path: "/" },
      ]);
      for (const width of [375, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const route of [
          "/",
          "/dashboard",
          "/timers",
          "/tools",
          "/tools/market",
          "/tools/crafting",
          "/tools/refining",
          "/tools/enchanting",
          "/tools/transporting",
          "/tools/flipping",
          "/tools/gold",
          "/items",
          "/builds",
          "/builds/new",
          "/compositions",
          "/compositions/new",
          "/groups",
          `/groups/${group.slug}`,
          "/favorites",
          "/settings",
          "/legal",
          "/guides",
        ]) {
          await page.goto(route);
          await page.locator("main h1").waitFor();
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily),
          ).toMatch(/inter/i);
          expect(
            await page
              .locator("main h1")
              .first()
              .evaluate((el) => getComputedStyle(el).fontFamily),
          ).toMatch(
            route !== "/" && (await page.locator("main h1.display-title:not(.page-title)").count())
              ? /barlow/i
              : /inter/i,
          );
          if (route === "/tools/market") {
            await page.getByRole("button", { name: "Compare prices", exact: true }).click();
            await expect(page.getByRole("cell", { name: "Caerleon", exact: true })).toBeVisible();
            expect(
              await page
                .locator("td.numeric")
                .first()
                .evaluate((el) => getComputedStyle(el).fontFamily),
            ).toMatch(/geistMono/i);
          }
          if (route === "/builds/new") {
            await page.getByRole("button", { name: /^Select Main hand slot\b/ }).click();
            await page.getByRole("button", { name: /^Equip Battleaxe\b/ }).click();
            if (width <= 780)
              await page.getByRole("button", { name: "Equipment", exact: true }).click();
          }
          if (route === "/compositions/new")
            await page.getByRole("button", { name: "20 players", exact: true }).click();
          const top = await page.locator(".site-header").boundingBox();
          const content = await page.locator("main").boundingBox();
          // Redesigned chrome is 88px on desktop and 76px on mobile/tablet.
          expect(top!.height).toBeLessThanOrEqual(width > 1100 ? 96 : 80);
          expect(content!.y).toBeGreaterThanOrEqual(top!.y + top!.height);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          const axe = [375, 1440].includes(width)
            ? await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
                .analyze()
            : null;
          const name = route.startsWith("/groups/")
            ? "guild"
            : route.replaceAll("/", "_") || "home";
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: `.qa/design-review/${theme === "light" ? "light-" : ""}${name}-${width}.png`,
            fullPage: true,
          });
          rows.push({
            route: name,
            theme,
            width,
            overflow,
            violations:
              axe?.violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
              })) ?? [],
          });
        }
      }
    }
    await page.goto("/");
    await page.getByRole("combobox", { name: "Search market items" }).fill("T6_MAIN_AXE@1");
    await page
      .getByRole("listbox", { name: "Matching market items" })
      .getByRole("option")
      .first()
      .click();
    await page.getByRole("link", { name: "Explore market", exact: true }).click();
    await page.getByText("Advanced item identifier", { exact: true }).click();
    await expect(page.getByLabel("Item identifier", { exact: true })).toHaveValue("T6_MAIN_AXE@1");
    await expect(page).toHaveURL(/region=europe/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const animations = await page
      .locator("main")
      .evaluate(
        (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      );
    expect(animations).toBe(0);
    await writeFile(".qa/design-review.json", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(176);
    expect(rows.filter((r) => r.overflow)).toEqual([]);
    expect(rows.flatMap((r) => r.violations)).toEqual([]);
  } finally {
    await db.group.delete({ where: { id: group.id } });
    await db.user.delete({ where: { id } });
  }
});
