import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("expired sessions cannot export private data", async ({ context }) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() - 60000) } },
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
    expect((await context.request.get("/api/account/export")).status()).toBe(401);
  } finally {
    await db.user.delete({ where: { id } });
  }
});
test("literal hostile text, concurrent edits, pagination and secure logout", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
    tag = randomUUID().slice(0, 8);
  await db.user.create({
    data: {
      id,
      name: "QA author",
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
  const input = {
    title: `QA ${tag} <script>alert(1)</script>`,
    description: "'); DROP TABLE User; --",
    contentType: "Solo Mists",
    region: "europe",
    visibility: "UNLISTED",
    playerCount: 1,
    recommendedIP: 0,
    strategy: "<img src=x onerror=alert(1)>",
    patchNotes: "",
    equipment: [
      { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1, abilities: "", alternatives: "" },
    ],
  };
  try {
    const created = await context.request.post("/api/builds", {
      headers: { origin: "http://localhost:3000" },
      data: { ...input, authorId: "attacker", role: "ADMIN" },
    });
    expect(created.status()).toBe(201);
    const saved = await created.json();
    expect((await db.build.findUniqueOrThrow({ where: { id: saved.id } })).authorId).toBe(id);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).role).toBe("USER");
    await page.goto(`/builds/${saved.id}`);
    await expect(page.getByRole("heading", { name: input.title })).toBeVisible();
    // Only the renderer's icons and the site's own static slot marks may be images here.
    expect(
      await page
        .locator("main script, main img:not([data-albion-icon]):not([data-slot-mark])")
        .count(),
    ).toBe(0);
    expect(
      await page
        .locator("main img[data-slot-mark]")
        .evaluateAll((nodes) =>
          nodes.every((n) =>
            (n as HTMLImageElement).getAttribute("src")!.startsWith("/albion/slots/"),
          ),
        ),
    ).toBe(true);
    expect(
      (await context.request.get(`/api/builds/${saved.id}`)).headers()["cache-control"],
    ).toContain("no-store");
    const write = () =>
      context.request.put(`/api/builds/${saved.id}`, {
        headers: { origin: "http://localhost:3000" },
        data: { version: 1, build: input },
      });
    const responses = await Promise.all([write(), write()]);
    expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(await db.buildVersion.count({ where: { buildId: saved.id } })).toBe(2);
    const oversized = await context.request.post("/api/builds", {
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      data: JSON.stringify({ payload: "x".repeat(70000) }),
    });
    expect(oversized.status()).toBe(413);
    await db.build.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        authorId: id,
        title: `QA ${tag} pagination ${i}`,
        description: "",
        contentType: "Other",
        region: "europe",
        visibility: "PUBLIC" as const,
        strategy: "",
        patchNotes: "",
      })),
    });
    await page.goto(`/builds?q=${tag}`);
    await expect(page.locator(".build-discovery-grid .build-preview-card")).toHaveCount(24);
    await page.getByRole("link", { name: "Next page" }).click();
    await expect(page.locator(".build-discovery-grid .build-preview-card")).toHaveCount(1);
    await page.goBack();
    await expect(page.locator(".build-discovery-grid .build-preview-card")).toHaveCount(24);
    const csrf = await (await context.request.get("/api/auth/csrf")).json();
    await context.request.post("/api/auth/signout", {
      form: { csrfToken: csrf.csrfToken, callbackUrl: "/", json: "true" },
    });
    expect((await context.request.get("/api/account/export")).status()).toBe(401);
    expect(await db.session.count({ where: { userId: id } })).toBe(0);
    expect(await db.build.count({ where: { authorId: id } })).toBe(26);
  } finally {
    await db.user.delete({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
