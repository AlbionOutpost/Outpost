import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("landing likes require an account, persist independently and reject forged writes", async ({
  page,
  context,
  browser,
}) => {
  const ids = [0, 1].map(() => `atlas-test-${randomUUID()}`);
  const tokens = ids.map(() => randomUUID());
  const other = await browser.newContext({ baseURL: "http://localhost:3000" });
  const anonymous = await browser.newContext({ baseURL: "http://localhost:3000" });
  const targets = [
    ["build", "battleaxe-mist-build"],
    ["composition", "hellgate-5v5-front-to-back"],
  ];
  try {
    for (let i = 0; i < ids.length; i++) {
      await db.user.create({
        data: {
          id: ids[i],
          name: `Landing like fixture ${i}`,
          sessions: { create: { sessionToken: tokens[i], expires: new Date(Date.now() + 600000) } },
        },
      });
      await [context, other][i].addCookies([
        {
          name: "next-auth.session-token",
          value: tokens[i],
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    for (const [kind, slug] of targets) {
      const url = `/api/library-likes/${kind}/${slug}`;
      const request = (client: typeof context, active: boolean, origin = "http://localhost:3000") =>
        client.request.post(url, { headers: { origin }, data: { active } });
      const before = await anonymous.request.get(url);
      expect(before.status()).toBe(200);
      expect(before.headers()["cache-control"]).toContain("no-store");
      expect(await before.json()).toMatchObject({ signedIn: false, liked: false });
      expect((await request(anonymous, true)).status()).toBe(401);
      expect((await request(context, true, "https://attacker.invalid")).status()).toBe(403);
      expect(
        (
          await context.request.post(url, {
            headers: { origin: "http://localhost:3000" },
            data: { active: true, userId: ids[1] },
          })
        ).status(),
      ).toBe(400);
      const added = await Promise.all([request(context, true), request(context, true)]);
      expect(added.map((r) => r.status())).toEqual([200, 200]);
      expect(await db.libraryLike.count({ where: { userId: ids[0], kind, slug } })).toBe(1);
      if (kind === "build") {
        const build = JSON.parse(readFileSync("public/library/grind-builds.json", "utf8")).find(
          (row: { slug: string; id: string }) => row.slug === slug,
        );
        const alias = await context.request.post(`/api/library-likes/build/${build.id}`, {
          headers: { origin: "http://localhost:3000" },
          data: { active: true },
        });
        expect(alias.status()).toBe(200);
        expect(await db.libraryLike.count({ where: { userId: ids[0], kind } })).toBe(1);
      }

      expect(await (await other.request.get(url)).json()).toMatchObject({
        signedIn: true,
        liked: false,
      });
      expect(await (await context.request.get(url)).json()).toMatchObject({
        signedIn: true,
        liked: true,
      });
    }
    await page.goto("/");
    const hearts = page.locator(".landing-window .heart-chip");
    for (let i = 0; i < 2; i++) {
      const heart = hearts.nth(i);
      await expect(heart).toHaveAttribute("aria-pressed", "true");
      await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", "false");
      await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", "true");
    }
    await page.reload();
    await expect(hearts.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(hearts.nth(1)).toHaveAttribute("aria-pressed", "true");
    const exported = await context.request.get("/api/account/export");
    expect((await exported.json()).profile.libraryLikes).toHaveLength(2);
    expect(
      (
        await context.request.post("/api/library-likes/build/not-a-real-library-build", {
          headers: { origin: "http://localhost:3000" },
          data: { active: true },
        })
      ).status(),
    ).toBe(404);
    await db.session.updateMany({
      where: { userId: ids[0] },
      data: { expires: new Date(Date.now() - 10000) },
    });
    expect(
      (
        await context.request.post("/api/library-likes/build/battleaxe-mist-build", {
          headers: { origin: "http://localhost:3000" },
          data: { active: false },
        })
      ).status(),
    ).toBe(401);
    await db.user.deleteMany({ where: { id: ids[0] } });
    expect(await db.libraryLike.count({ where: { userId: ids[0] } })).toBe(0);
  } finally {
    await other.close();
    await anonymous.close();
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
