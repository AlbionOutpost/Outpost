import { test, expect } from "@playwright/test";
import { createTestDb } from "./support/db";
import { randomUUID } from "node:crypto";
try {
  process.loadEnvFile(".env");
} catch {}
const db = createTestDb();
test("create, revise and publish a build with ownership and conflict checks", async ({
  page,
  context,
  browser,
}) => {
  const ownerId = `atlas-test-${randomUUID()}`,
    otherId = `atlas-test-${randomUUID()}`;
  const token = randomUUID(),
    otherToken = randomUUID();
  await db.user.create({
    data: {
      id: ownerId,
      name: "Build author",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  await db.user.create({
    data: {
      id: otherId,
      name: "Other author",
      sessions: { create: { sessionToken: otherToken, expires: new Date(Date.now() + 600000) } },
    },
  });
  const other = await browser.newContext({ baseURL: "http://localhost:3000" });
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
    await page.goto("/builds/new");
    await page.getByLabel("Build title").fill("Browser tested Battleaxe");
    await page.getByRole("tab", { name: "Notes", exact: true }).click();
    await page.getByText("Advanced item IDs & notes", { exact: true }).click();
    await page.getByLabel("Item ID 1").fill("T6_MAIN_AXE@1");
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Browser tested Battleaxe" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Browser tested Battleaxe" })).toBeVisible();
    const id = new URL(page.url()).pathname.split("/").pop()!;
    const initial = await db.build.findUniqueOrThrow({
      where: { id },
      include: { equipment: true },
    });
    expect(initial.authorId).toBe(ownerId);
    expect(initial.visibility).toBe("PRIVATE");
    await other.addCookies([
      {
        name: "next-auth.session-token",
        value: otherToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    expect((await other.request.get(`/api/builds/${id}`)).status()).toBe(404);
    expect(
      (
        await other.request.delete(`/api/builds/${id}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await context.request.delete(`/api/builds/${id}`, {
          headers: { origin: "https://attacker.example" },
        })
      ).status(),
    ).toBe(403);
    await page.getByRole("link", { name: "Edit build" }).click();
    await page.getByLabel("Build title").fill("Revised Battleaxe");
    await page.getByLabel("Build visibility", { exact: true }).selectOption("PUBLIC");
    await page.getByRole("button", { name: "Save new revision" }).click();
    await expect(page.getByRole("heading", { name: "Revised Battleaxe" })).toBeVisible();
    const updated = await db.build.findUniqueOrThrow({
      where: { id },
      include: { versions: true },
    });
    expect(updated.version).toBe(2);
    expect(updated.versions).toHaveLength(2);
    expect((await other.request.get(`/api/builds/${id}`)).status()).toBe(200);
    const draft = {
      title: initial.title,
      description: initial.description,
      contentType: initial.contentType,
      region: initial.region,
      visibility: initial.visibility,
      playerCount: initial.playerCount,
      recommendedIP: initial.recommendedIP,
      strategy: initial.strategy,
      patchNotes: initial.patchNotes,
      equipment: initial.equipment,
    };
    const stale = await context.request.put(`/api/builds/${id}`, {
      headers: { origin: "http://localhost:3000" },
      data: { version: 1, build: draft },
    });
    expect(stale.status()).toBe(409);
    const otherEdit = await other.request.put(`/api/builds/${id}`, {
      headers: { origin: "http://localhost:3000" },
      data: { version: 2, build: draft },
    });
    expect(otherEdit.status()).toBe(409);
    const still = await db.build.findUniqueOrThrow({ where: { id } });
    expect(still.title).toBe("Revised Battleaxe");
    expect(still.version).toBe(2);
    await page.goto("/builds?q=Revised");
    await expect(page.getByRole("heading", { name: "Revised Battleaxe" })).toBeVisible();
    expect(
      (
        await context.request.delete(`/api/builds/${id}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(204);
    expect(await db.buildVersion.count({ where: { buildId: id } })).toBe(0);
  } finally {
    await other.close();
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
  }
});
test.afterAll(() => db.$disconnect());
