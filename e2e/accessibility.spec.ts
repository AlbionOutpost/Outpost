import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
try {
  process.loadEnvFile(".env");
} catch {}

/** WCAG 2.2 AA scan of every main page. Serious and critical findings fail the run. */
const pages = [
  "/",
  "/tools",
  "/tools/market",
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
  "/tools/gold",
  "/tools/reference",
  "/tools/avalon-mapper",
  "/tools/kill-feed",
  "/builds",
  "/builds/activities",
  "/builds/library/battleaxe-mist-build",
  "/compositions",
  "/compositions/library/dreamteam",
  "/guides",
  "/guides/albion-journal-guide",
  "/items",
  "/items/T4_MAIN_AXE",
  "/market-data",
  "/groups",
  "/giveaways",
  "/supporter",
  "/shopping-list",
  "/signin",
];
/** Pages that need an account; scanned with a fixture session. */
const accountPages = [
  "/dashboard",
  "/settings",
  "/favorites",
  "/timers",
  "/builds/new",
  "/compositions/new",
  "/groups/new",
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("h1").first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  const blocking = violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
  expect(
    blocking.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
    })),
    path,
  ).toEqual([]);
}

for (const viewport of viewports) {
  test.describe(`axe at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const path of pages) {
      test(`${path} has no serious or critical violations`, async ({ page }) => {
        await scan(page, path);
      });
    }
  });
}

test.describe("signed-in pages", () => {
  const db = createTestDb();
  const id = `atlas-test-${randomUUID().replaceAll("-", "")}`;
  const token = randomUUID();
  test.beforeAll(async () => {
    await db.user.create({
      data: {
        id,
        name: "Axe scan",
        region: "europe",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 3600000) } },
      },
    });
  });
  test.afterAll(async () => {
    await db.user.delete({ where: { id } }).catch(() => {});
    await db.$disconnect();
  });
  test.beforeEach(async ({ context }) => {
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
  });
  for (const viewport of viewports) {
    for (const path of accountPages) {
      test(`${path} at ${viewport.name} has no serious or critical violations`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await scan(page, path);
      });
    }
  }
});

test("every public page has a single h1 and one main landmark", async ({ page }) => {
  test.setTimeout(240_000);
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator("h1:visible"), `${path} h1`).toHaveCount(1);
    expect(await page.locator("main, [role=main]").count(), `${path} main`).toBe(1);
  }
});

test("headings never skip a level", async ({ page }) => {
  test.setTimeout(240_000);
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    const skips = await page.evaluate(() => {
      const levels = [
        ...document.querySelectorAll<HTMLElement>(
          "main h1, main h2, main h3, main h4, main h5, main h6",
        ),
      ]
        .filter((h) => h.offsetParent !== null || h.getClientRects().length)
        .map((h) => ({ level: Number(h.tagName[1]), text: h.textContent?.trim().slice(0, 40) }));
      return levels
        .filter((h, i) => i > 0 && h.level > levels[i - 1].level + 1)
        .map((h) => `h${h.level} "${h.text}"`);
    });
    expect(skips, path).toEqual([]);
  }
});

test.describe("keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the skip link and focus ring are visible", async ({ page }) => {
    await page.goto("/tools/market");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(ring.outline).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(2);
  });

  test("the Tools menu opens, is walkable and closes with Escape", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const summary = nav.locator(".tools-dropdown > summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(nav.locator(".tools-dropdown")).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(nav.locator(".tools-dropdown a.menu-item").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(nav.locator(".tools-dropdown")).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
  });

  test("an open menu closes when focus leaves it", async ({ page }) => {
    await page.goto("/");
    const dropdown = page.locator(".site-header .more-dropdown");
    await dropdown.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(dropdown).toHaveAttribute("open", "");
    const links = dropdown.locator("a");
    const count = await links.count();
    for (let i = 0; i <= count; i++) await page.keyboard.press("Tab");
    await expect(dropdown).not.toHaveAttribute("open", "");
  });

  test("the item picker works from the keyboard", async ({ page }) => {
    await page.goto("/tools/market");
    const box = page.getByRole("combobox", { name: "Search market items" });
    await expect(box).toBeEnabled();
    await box.focus();
    await box.fill("Bag");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    const active = await box.getAttribute("aria-activedescendant");
    expect(active).toMatch(/option-\d+$/);
    await expect(page.locator(`[id="${active}"]`)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(box).toBeFocused();
  });
});

test.describe("phone navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the drawer traps focus, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close navigation" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test("reduced motion leaves nothing moving", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/builds", "/tools", "/guides"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === "running")
        .map((a) => (a as CSSAnimation).animationName || a.constructor.name),
    );
    expect(running, path).toEqual([]);
  }
});
