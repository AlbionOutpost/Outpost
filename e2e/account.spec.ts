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
test("account export excludes revoked team ledgers and deletion preserves shared records without attribution", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    ownerId = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  let groupId = "";
  try {
    await db.user.create({
      data: {
        id,
        name: "Ledger export fixture",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
      },
    });
    await db.user.create({ data: { id: ownerId, name: "Independent team owner" } });
    const group = await db.group.create({
      data: {
        name: "Private ledger export fixture",
        slug: `export-${randomUUID().slice(0, 8)}`,
        description: "",
        region: "europe",
        ownerId,
        members: {
          create: [
            { userId: ownerId, role: "OWNER" },
            { userId: id, role: "OFFICER" },
          ],
        },
      },
    });
    groupId = group.id;
    const configuration = {
      pool: 100,
      expenses: [],
      participants: [{ userId: id, shares: 1 }],
      notes: "Shared team financial notes must not enter account exports",
    };
    const split = await db.groupLootSplit.create({
      data: { groupId, title: "Authored team split", createdById: id, configuration },
    });
    const compositionFields = {
      authorId: id,
      title: "Owned private composition retained",
      description: "",
      region: "europe",
      contentType: "Other",
      notes: "Personal composition notes",
      slots: [
        {
          id: randomUUID(),
          playerName: "",
          role: "DPS",
          customRole: "",
          mandatory: true,
          substitute: "",
          notes: "",
          sourceBuildId: null,
          equipment: [],
          equipmentSets: [],
        },
      ],
    };
    const privateComposition = await db.composition.create({
      data: { ...compositionFields, visibility: "PRIVATE", groupId: null },
    });
    const teamComposition = await db.composition.create({
      data: {
        ...compositionFields,
        title: "Revocable authored team comp",
        visibility: "GROUP",
        groupId,
        notes: "Private team composition notes after collaboration",
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
    const included = await context.request.get("/api/account/export");
    expect(included.ok()).toBe(true);
    const current = await included.json();
    expect(current.profile.authoredLootSplits).toHaveLength(1);
    expect(current.profile.authoredLootSplits[0]).toMatchObject({
      id: split.id,
      groupId,
      title: "Authored team split",
      version: 1,
    });
    expect(current.profile.authoredLootSplits[0]).not.toHaveProperty("configuration");
    expect(JSON.stringify(current)).not.toContain(configuration.notes);
    expect(current.profile.compositions.map((row: { id: string }) => row.id)).toEqual(
      expect.arrayContaining([privateComposition.id, teamComposition.id]),
    );
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: id } } });
    const revoked = await context.request.get("/api/account/export");
    expect(revoked.ok()).toBe(true);
    const exported = await revoked.json();
    expect(exported.profile.authoredLootSplits).toEqual([]);
    expect(JSON.stringify(exported)).not.toContain("Authored team split");
    expect(exported.profile.compositions.map((row: { id: string }) => row.id)).toEqual([
      privateComposition.id,
    ]);
    expect(JSON.stringify(exported)).not.toContain(
      "Private team composition notes after collaboration",
    );
    expect(JSON.stringify(exported)).not.toContain("Revocable authored team comp");
    expect((await context.request.get(`/api/groups/${groupId}/loot`)).status()).toBe(404);
    await page.goto("/settings");
    await page.getByLabel(/^Type DELETE/).fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
    await expect(page).toHaveURL(/signin/);
    expect(await db.user.findUnique({ where: { id } })).toBeNull();
    const retained = await db.groupLootSplit.findUniqueOrThrow({ where: { id: split.id } });
    expect(retained.createdById).toBeNull();
    expect(retained.configuration).toEqual(configuration);
    expect(retained.version).toBe(1);
  } finally {
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: [id, ownerId] } } });
  }
});
test.afterAll(() => db.$disconnect());
