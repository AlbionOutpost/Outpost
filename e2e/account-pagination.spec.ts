import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
import { initialProduction } from "../src/lib/albion/production";
import { initialTransport } from "../src/lib/albion/transport";
const db = createTestDb();

test("older timers and scenarios remain reachable with tied dates, deletions and private cursors", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
    other = `atlas-test-${randomUUID()}`,
    otherToken = randomUUID();
  const timestamp = new Date("2026-01-01T00:00:00.000Z");
  try {
    await db.user.create({
      data: {
        id,
        name: "Pagination QA fixture",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        timers: {
          create: Array.from({ length: 101 }, (_, i) => ({
            id: `${id}-timer-${String(i).padStart(3, "0")}`,
            title: `Timer fixture ${i}`,
            category: "CUSTOM",
            durationMs: 60000,
            dueAt: new Date(Date.now() + 60000),
            updatedAt: timestamp,
          })),
        },
        savedScenarios: {
          create: ["crafting", "transporting", "shopping-list"].flatMap((kind) =>
            Array.from({ length: 51 }, (_, i) => ({
              id: `${id}-${kind}-${String(i).padStart(3, "0")}`,
              title: `${kind} fixture ${i}`,
              kind,
              configuration:
                kind === "crafting"
                  ? initialProduction("crafting", "europe")
                  : kind === "transporting"
                    ? initialTransport("europe")
                    : {
                        kind,
                        region: "europe",
                        list: { version: 1, region: "europe", entries: [] },
                      },
              updatedAt: timestamp,
            })),
          ),
        },
      },
    });
    await db.user.create({
      data: {
        id: other,
        sessions: { create: { sessionToken: otherToken, expires: new Date(Date.now() + 600000) } },
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
    for (const [url, size] of [
      ["/api/timers", 100],
      ["/api/scenarios?kind=shopping-list", 50],
    ] as const) {
      const first = await context.request.get(url);
      expect(first.status()).toBe(200);
      const rows = await first.json();
      expect(rows).toHaveLength(size);
      const cursor = first.headers()["x-next-cursor"];
      expect(cursor).toBeTruthy();
      const next = url + (url.includes("?") ? "&" : "?") + new URLSearchParams({ cursor });
      // Cursor carries ordering only: deleting its anchor must not strand older rows.
      if (url.includes("timers")) await db.timer.delete({ where: { id: rows.at(-1).id } });
      const second = await context.request.get(next);
      expect(second.status()).toBe(200);
      const tail = await second.json();
      expect(tail).toHaveLength(1);
      expect(rows.some((r: { id: string }) => r.id === tail[0].id)).toBe(false);
      expect(second.headers()["x-next-cursor"]).toBeUndefined();
      const outsider = await browser.newContext();
      try {
        expect((await outsider.request.get(next)).status()).toBe(401);
        await outsider.addCookies([
          {
            name: "next-auth.session-token",
            value: otherToken,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
        expect(await (await outsider.request.get(next)).json()).toEqual([]);
      } finally {
        await outsider.close();
      }
      expect(
        (
          await context.request.get(url + (url.includes("?") ? "&" : "?") + "cursor=malformed")
        ).status(),
      ).toBe(400);
    }
    // Restore the removed anchor for the same >100 boundary in the actual UI.
    await db.timer.create({
      data: {
        id: `${id}-timer-001`,
        userId: id,
        title: "Timer fixture 1",
        category: "CUSTOM",
        durationMs: 60000,
        dueAt: new Date(Date.now() + 60000),
        updatedAt: timestamp,
      },
    });
    await page.route("**/api/economy/prices?**", (route) =>
      route.fulfill({ status: 503, json: { error: "QA unavailable prices" } }),
    );
    await page.route("**/api/item-icon?**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"/>',
      }),
    );
    await page.goto("/timers");
    await expect(page.getByRole("heading", { name: "Timer fixture 0", exact: true })).toHaveCount(
      0,
    );
    await page.route(
      "**/api/timers?cursor=**",
      (route) => route.fulfill({ status: 503, json: { error: "QA retry older timers" } }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Load older timers", exact: true }).click();
    await expect(page.getByText("QA retry older timers", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timer fixture 0", exact: true })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Load older timers", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Timer fixture 0", exact: true })).toBeVisible();
    await expect(page.getByText("Updating countdown…", { exact: true })).toHaveCount(0);
    for (const width of [320, 375, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : 844 });
      await page
        .getByRole("heading", { name: "Timer fixture 0", exact: true })
        .scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `.qa/deep-fixes-2026-11-02/timers-${width}.png` });
    }
    for (const [url, open, load, more, title] of [
      [
        "/shopping-list",
        "Save & load account lists",
        "Load account lists",
        "Load older account lists",
        "shopping-list fixture 0",
      ],
      [
        "/tools/crafting",
        null,
        "Load saved scenarios",
        "Load older scenarios",
        "crafting fixture 0",
      ],
      [
        "/tools/transporting",
        "Saved transport plans",
        "Load transport plans",
        "Load older transport plans",
        "transporting fixture 0",
      ],
    ] as const) {
      await page.goto(url);
      if (open)
        await page.locator("summary, button[aria-expanded]").filter({ hasText: open }).click();
      if (url === "/tools/crafting")
        await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
      await page.getByRole("button", { name: load, exact: true }).click();
      await expect(page.getByRole("button", { name: `Restore ${title}`, exact: true })).toHaveCount(
        0,
      );
      await page.getByRole("button", { name: more, exact: true }).click();
      await expect(
        page.getByRole("button", { name: `Restore ${title}`, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: more, exact: true })).toHaveCount(0);
    }
  } finally {
    await db.user.deleteMany({ where: { id: { in: [id, other] } } });
  }
});
