import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb(),
  origin = "http://localhost:3000";
test("private watchlists persist region/quality and deny foreign deletion, spoofing and bad origins", async ({
  page,
  context,
  browser,
}) => {
  const users = [0, 1].map(() => ({ id: `atlas-test-${randomUUID()}`, token: randomUUID() }));
  const outsider = await browser.newContext();
  try {
    for (const user of users)
      await db.user.create({
        data: {
          id: user.id,
          sessions: {
            create: { sessionToken: user.token, expires: new Date(Date.now() + 600000) },
          },
        },
      });
    const cookie = (value: string) => ({
      name: "next-auth.session-token",
      value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
    });
    await context.addCookies([cookie(users[0].token)]);
    await outsider.addCookies([cookie(users[1].token)]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tools/market?region=asia&item=T4_BAG&quality=2");
    await page.getByText("Your market watchlist", { exact: true }).click();
    await page.getByRole("button", { name: "Save selected item", exact: true }).click();
    await expect(page.locator(".market-watchlist").getByRole("status")).toContainText("Item saved");
    const row = await db.marketWatchItem.findFirstOrThrow({ where: { userId: users[0].id } });
    expect(row).toMatchObject({ region: "asia", itemId: "T4_BAG", quality: 2 });
    await page.reload();
    await page.getByText("Your market watchlist", { exact: true }).click();
    await page.getByRole("button", { name: "Load your watchlist", exact: true }).click();
    await expect(page.locator(".watchlist-items a")).toHaveAttribute(
      "href",
      "/tools/market?region=asia&item=T4_BAG&quality=2",
    );
    const warmed = await context.request.get("/api/market-watch");
    expect(warmed.headers()["cache-control"]).toBe("private, no-store");
    const exported = await context.request.get("/api/account/export");
    expect(exported.status()).toBe(200);
    expect(
      (await exported.json()).profile.marketWatchItems.map((i: { id: string }) => i.id),
    ).toEqual([row.id]);
    await expect((await outsider.request.get("/api/market-watch")).json()).resolves.toEqual([]);
    expect(
      (
        await outsider.request.delete(`/api/market-watch/${row.id}`, { headers: { origin } })
      ).status(),
    ).toBe(404);
    expect(
      (
        await context.request.post("/api/market-watch", {
          headers: { origin: "https://invalid.example" },
          data: { region: "asia", itemId: "T4_BAG", quality: 2 },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.post("/api/market-watch", {
          headers: { origin },
          data: { region: "asia", itemId: "T4_BAG", quality: 2, userId: users[1].id },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await context.request.post("/api/market-watch", {
          headers: { origin },
          data: { region: "asia", itemId: "../invalid", quality: 6 },
        })
      ).status(),
    ).toBe(400);
    const duplicates = await Promise.all(
      [1, 2].map(() =>
        context.request.post("/api/market-watch", {
          headers: { origin },
          data: { region: "asia", itemId: "T4_BAG", quality: 2 },
        }),
      ),
    );
    expect(duplicates.map((r) => r.status())).toEqual([201, 201]);
    expect(await db.marketWatchItem.count({ where: { userId: users[0].id } })).toBe(1);
    await page.getByRole("button", { name: "Remove T4_BAG from watchlist", exact: true }).click();
    await expect(page.getByText("No saved items yet.", { exact: true })).toBeVisible();
    expect(await db.marketWatchItem.count({ where: { userId: users[0].id } })).toBe(0);
    await db.marketWatchItem.createMany({
      data: Array.from({ length: 99 }, (_, i) => ({
        userId: users[0].id,
        region: "europe",
        quality: 1,
        itemId: `T4_WATCH_FIXTURE_${i}`,
      })),
    });
    const capped = await Promise.all(
      ["T4_BAG", "T4_CAPE"].map((itemId) =>
        context.request.post("/api/market-watch", {
          headers: { origin },
          data: { region: "europe", itemId, quality: 1 },
        }),
      ),
    );
    expect(capped.map((r) => r.status()).sort()).toEqual([201, 409]);
    expect(await db.marketWatchItem.count({ where: { userId: users[0].id } })).toBe(100);
    await context.clearCookies();
    expect((await context.request.get("/api/market-watch")).status()).toBe(401);
    expect(
      (
        await context.request.post("/api/market-watch", {
          headers: { origin },
          data: { region: "asia", itemId: "T4_BAG", quality: 2 },
        })
      ).status(),
    ).toBe(401);
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await db.$disconnect();
  }
});
