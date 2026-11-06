import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
const origin = "http://localhost:3000";
async function fixture(browser: Browser) {
  const ids = Array.from({ length: 4 }, () => `atlas-test-admin-${randomUUID()}`),
    discord = ids.map((_, i) => `8${Date.now()}${String(i).padStart(4, "0")}`),
    contexts: BrowserContext[] = [];
  for (let i = 0; i < 4; i++) {
    const token = randomUUID();
    await db.user.create({
      data: {
        id: ids[i],
        name: `Admin QA ${i} ${ids[0].slice(-8)}`,
        email: `${ids[i]}@example.test`,
        role: i === 0 ? "ADMIN" : i === 2 ? "MODERATOR" : "USER",
        accounts: { create: { provider: "discord", providerAccountId: discord[i], type: "oauth" } },
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 86400000) } },
      },
    });
    const c = await browser.newContext();
    await c.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    contexts.push(c);
  }
  const cleanup = async () => {
    await db.adminAudit.deleteMany({ where: { actorId: { in: ids } } });
    await db.discordBan.deleteMany({ where: { discordId: { in: discord } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    for (const c of contexts) await c.close();
  };
  const detail = async (i = 1) => {
    const r = await contexts[0].request.get(`/api/admin/users/${ids[i]}`);
    expect(r.status()).toBe(200);
    return r.json();
  };
  const change = async (i: number, data: unknown, actor = 0) =>
    contexts[actor].request.post(`/api/admin/users/${ids[i]}`, { headers: { origin }, data });
  return { ids, discord, contexts, cleanup, detail, change };
}
test("admin overview and user controls enforce roles, CSRF and immutable billing fields", async ({
  browser,
  request,
}) => {
  const f = await fixture(browser);
  try {
    expect((await request.get("/api/admin/users")).status()).toBe(401);
    for (const n of [1, 2]) {
      const r = await f.contexts[n].request.get("/api/admin/users");
      expect(r.status()).toBe(403);
      expect(r.headers()["cache-control"]).toBe("private, no-store");
      const p = await f.contexts[n].newPage();
      await p.goto("/admin");
      await expect(p.getByRole("heading", { name: "Page not found" })).toBeVisible();
    }
    const d = await f.detail();
    const value = {
      action: "grant",
      days: 30,
      reason: "A verified friend gift",
      expectedUpdatedAt: d.user.updatedAt,
    };
    expect((await f.change(1, value, 1)).status()).toBe(403);
    expect((await f.change(1, value, 2)).status()).toBe(403);
    expect(
      (
        await f.contexts[0].request.post(`/api/admin/users/${f.ids[1]}`, {
          headers: { origin: "https://attacker.invalid" },
          data: value,
        })
      ).status(),
    ).toBe(403);
    expect((await f.change(1, { ...value, role: "ADMIN" })).status()).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.ids[1] } })).role).toBe("USER");
    const p = await f.contexts[0].newPage();
    await p.goto("/admin");
    await expect(p.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
    await p.getByRole("slider", { name: "Inspect a day" }).press("ArrowLeft");
    await p.getByRole("button", { name: "New builds", exact: true }).click();
    await expect(p.getByRole("img", { name: /New builds:/ })).toBeVisible();
    await p.getByRole("link", { name: "Users & access", exact: true }).click();
    await p.getByRole("textbox", { name: "Search users" }).fill(f.ids[1]);
    await p.getByRole("button", { name: "Search", exact: true }).click();
    await expect(p.getByRole("link", { name: /^Admin QA 1/, exact: true })).toHaveCount(1);
    const list = await f.contexts[0].request.get("/api/admin/users?q=" + f.ids[1]);
    const body = await list.text();
    for (const secret of ["sessionToken", "access_token", "refresh_token", "stripeCustomerId"])
      expect(body).not.toContain(secret);
  } finally {
    await f.cleanup();
  }
});
test("Supporter gifts are auditable, reject stale writes, expire and preserve paid entitlements", async ({
  browser,
}) => {
  const f = await fixture(browser);
  try {
    let d = await f.detail();
    const value = {
      action: "grant",
      days: 30,
      reason: "A verified friend gift",
      expectedUpdatedAt: d.user.updatedAt,
    };
    expect((await f.change(1, value)).status()).toBe(200);
    expect((await f.change(1, value)).status()).toBe(409);
    let user = await db.user.findUniqueOrThrow({ where: { id: f.ids[1] } });
    expect(user.plan).toBe("FREE");
    expect(user.supporterGiftUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(await db.adminAudit.count({ where: { actorId: f.ids[0], targetId: f.ids[1] } })).toBe(1);
    const p = await f.contexts[1].newPage();
    await p.goto("/supporter");
    await expect(p.getByRole("heading", { name: "Your Supporter gift is active" })).toBeVisible();
    await db.user.update({
      where: { id: f.ids[1] },
      data: { plan: "SUPPORTER", planStatus: "active" },
    });
    d = await f.detail();
    expect(
      (
        await f.change(1, {
          action: "revoke-gift",
          reason: "Gift ended; paid plan remains",
          expectedUpdatedAt: d.user.updatedAt,
        })
      ).status(),
    ).toBe(200);
    user = await db.user.findUniqueOrThrow({ where: { id: f.ids[1] } });
    expect(user.plan).toBe("SUPPORTER");
    expect(user.supporterGiftUntil).toBeNull();
    await db.user.update({
      where: { id: f.ids[3] },
      data: { supporterGiftUntil: new Date(Date.now() - 1000) },
    });
    const other = await f.contexts[3].newPage();
    await other.goto("/settings");
    await expect(
      other.getByText("Free. Supporters see no advertising and can run a Team workspace.", {
        exact: true,
      }),
    ).toBeVisible();
    d = await f.detail(3);
    const admin = await f.contexts[0].newPage();
    await admin.goto(`/admin/users/${f.ids[3]}`);
    await admin
      .getByRole("textbox", { name: "Reason for this change", exact: true })
      .fill("UI gift for a friend");
    await admin.getByRole("button", { name: "Grant Supporter", exact: true }).click();
    await expect(admin.getByRole("status")).toContainText("Supporter gift saved.");
  } finally {
    await f.cleanup();
  }
});
test("Discord bans revoke sessions, defeat concurrent signup, persist through deletion and protect staff", async ({
  browser,
}) => {
  const f = await fixture(browser);
  try {
    const post = (v: unknown) =>
      f.contexts[0].request.post("/api/admin/bans", { headers: { origin }, data: v });
    const value = {
      discordId: f.discord[1],
      action: "ban",
      days: 7,
      version: 0,
      reason: "Reviewed abusive content",
      confirmation: `BAN ${f.discord[1]}`,
    };
    expect((await post({ ...value, confirmation: "BAN someone else" })).status()).toBe(400);
    expect(
      (
        await post({ ...value, discordId: f.discord[0], confirmation: `BAN ${f.discord[0]}` })
      ).status(),
    ).toBe(403);
    expect((await post(value)).status()).toBe(200);
    expect(await db.session.count({ where: { userId: f.ids[1] } })).toBe(0);
    expect((await f.contexts[1].request.get("/api/account/export")).status()).toBe(401);
    expect((await post(value)).status()).toBe(409);
    // A signup that passed its earlier provider check may create its session after the ban.
    await db.user.update({ where: { id: f.ids[1] }, data: { bannedAt: null, bannedUntil: null } });
    const token = randomUUID();
    await db.session.create({
      data: { sessionToken: token, userId: f.ids[1], expires: new Date(Date.now() + 600000) },
    });
    await f.contexts[1].addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    expect((await f.contexts[1].request.get("/api/account/export")).status()).toBe(401);
    await db.user.delete({ where: { id: f.ids[1] } });
    const lookup = await f.contexts[0].request.get("/api/admin/bans?discordId=" + f.discord[1]);
    expect((await lookup.json()).ban.revokedAt).toBeNull();
    expect(
      (
        await post({
          ...value,
          action: "unban",
          version: 1,
          days: 0,
          confirmation: `UNBAN ${f.discord[1]}`,
          reason: "Appeal reviewed and approved",
        })
      ).status(),
    ).toBe(200);
    expect(
      (await db.discordBan.findUniqueOrThrow({ where: { discordId: f.discord[1] } })).revokedAt,
    ).not.toBeNull();
  } finally {
    await f.cleanup();
  }
});
test("revoked administrative roles lose warmed access immediately", async ({ browser }) => {
  const f = await fixture(browser);
  try {
    expect((await f.contexts[0].request.get("/api/admin/users")).status()).toBe(200);
    const d = await f.detail();
    await db.user.update({ where: { id: f.ids[0] }, data: { role: "USER" } });
    expect((await f.contexts[0].request.get("/api/admin/users")).status()).toBe(403);
    expect(
      (
        await f.change(1, {
          action: "grant",
          days: 0,
          reason: "Must never be applied",
          expectedUpdatedAt: d.user.updatedAt,
        })
      ).status(),
    ).toBe(403);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: f.ids[1] } })).supporterGiftPermanent,
    ).toBe(false);
  } finally {
    await f.cleanup();
  }
});

test("account review uses observed signals without automatically banning users", async ({
  browser,
}) => {
  const f = await fixture(browser);
  try {
    await db.session.createMany({
      data: Array.from({ length: 8 }, () => ({
        userId: f.ids[1],
        sessionToken: randomUUID(),
        expires: new Date(Date.now() + 600000),
      })),
    });
    const page = await f.contexts[0].newPage();
    await page.goto("/admin/review");
    await expect(page.getByRole("heading", { name: "Account review", exact: true })).toBeVisible();
    await expect(page.getByText("9 unexpired sessions", { exact: true })).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id: f.ids[1] } })).bannedAt).toBeNull();
    const d = await f.detail();
    expect(
      (
        await f.change(1, {
          action: "revoke-sessions",
          reason: "Review requested a new sign-in",
          expectedUpdatedAt: d.user.updatedAt,
        })
      ).status(),
    ).toBe(200);
    expect(await db.session.count({ where: { userId: f.ids[1] } })).toBe(0);
    expect((await f.contexts[1].request.get("/api/account/export")).status()).toBe(401);
  } finally {
    await f.cleanup();
  }
});
