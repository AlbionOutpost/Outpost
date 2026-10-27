import { test, expect } from "@playwright/test";
import { createTestDb } from "./support/db";
import { randomUUID } from "node:crypto";
try {
  process.loadEnvFile(".env");
} catch {}
const db = createTestDb();
test("database session authorizes only its own profile, export and deletion", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`;
  const token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Atlas test",
      region: "europe",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
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
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Profile & preferences" })).toBeVisible();
    await page.getByLabel("Display name").fill("Updated adventurer");
    await page.locator('select[name="region"]').selectOption("asia");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("status")).toContainText("Preferences saved");
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    expect(user.name).toBe("Updated adventurer");
    expect(user.region).toBe("asia");
    const response = await context.request.get("/api/account/export");
    expect(response.status()).toBe(200);
    const exported = await response.json();
    expect(exported.profile.id).toBe(id);
    expect(JSON.stringify(exported)).not.toContain(token);
    await page.getByLabel("Type DELETE").fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete account" }).click();
    await expect(page).toHaveURL(/signin/);
    expect(await db.user.findUnique({ where: { id } })).toBeNull();
    expect(await db.session.count({ where: { userId: id } })).toBe(0);
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
