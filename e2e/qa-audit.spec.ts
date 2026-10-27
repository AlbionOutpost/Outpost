import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("audit page layouts, accessibility and local browser timings", async ({ page, context }) => {
  test.setTimeout(180000);
  await mkdir(".qa/screenshots", { recursive: true });
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "QA fixture author",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const build = await db.build.create({
    data: {
      authorId: id,
      title: "QA fixture loadout",
      description: "Temporary audit fixture — removed after test.",
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
          abilities: "Manual author notes",
          alternatives: "",
        },
      },
    },
  });
  const rows: unknown[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
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
    for (const width of [320, 375, 430, 768, 1024, 1440, 1920])
      for (const route of [
        "/",
        "/items",
        "/tools",
        "/tools/market",
        "/tools/flipping",
        "/tools/gold",
        "/builds",
        "/builds/new",
        `/builds/${build.id}`,
        `/builds/${build.id}/edit`,
        "/settings",
        "/legal",
      ]) {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(route);
        await page.locator("main h1").waitFor();
        const measurement = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          navigation: (() => {
            const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
            return {
              ttfbMs: n.responseStart - n.requestStart,
              domContentLoadedMs: n.domContentLoadedEventEnd,
            };
          })(),
        }));
        const axe = [375, 1440].includes(width)
          ? await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
              .analyze()
          : null;
        const screenshot = [375, 768, 1440, 1920].includes(width)
          ? `.qa/screenshots/${route.replaceAll("/", "_") || "home"}-${width}.png`
          : null;
        if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
        rows.push({
          width,
          route: route.replace(build.id, "[fixture]"),
          status: response?.status(),
          ...measurement,
          screenshot,
          violations: axe?.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
        });
      }
    await writeFile(".qa/ui-audit.json", JSON.stringify({ rows, errors }, null, 2));
    expect(rows.length).toBe(84);
    expect(errors).toEqual([]);
    const evidence = JSON.parse(
      await (await import("node:fs/promises")).readFile(".qa/ui-audit.json", "utf8"),
    );
    expect(evidence.rows.filter((r: { overflow: boolean }) => r.overflow)).toEqual([]);
    expect(evidence.rows.flatMap((r: { violations?: unknown[] }) => r.violations || [])).toEqual(
      [],
    );
  } finally {
    await db.user.delete({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
