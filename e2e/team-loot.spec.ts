import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
import { seedTeamRoles } from "../src/lib/groups/roles";
const db = createTestDb();
test("team loot conserves silver and enforces current membership, officer permission and revisions", async ({
  page,
  context,
  browser,
}) => {
  const ids = Array.from({ length: 4 }, () => `atlas-test-${randomUUID()}`),
    contexts = [context];
  for (let i = 1; i < 4; i++)
    contexts.push(await browser.newContext({ baseURL: "http://localhost:3000" }));
  let groupId = "",
    otherId = "";
  try {
    for (let i = 0; i < 4; i++) {
      const token = randomUUID();
      await db.user.create({
        data: {
          id: ids[i],
          name: ["Loot owner", "Loot officer", "Loot member", "Loot outsider"][i],
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      await contexts[i].addCookies([
        {
          name: "next-auth.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    const slug = `loot-${randomUUID().slice(0, 8)}`,
      team = await db.group.create({
        data: {
          name: "Team loot QA",
          slug,
          description: "Isolated fixture",
          region: "europe",
          visibility: "PUBLIC",
          ownerId: ids[0],
          members: {
            create: ids.slice(0, 3).map((userId, i) => ({
              userId,
              role: ["OWNER", "OFFICER", "MEMBER"][i] as "OWNER" | "OFFICER" | "MEMBER",
            })),
          },
        },
      });
    groupId = team.id;
    // Map the fixture's fixed roles onto the team's roles, as the schema migration does.
    await seedTeamRoles(db, groupId);
    const post = (actor: number, group: string, data: unknown) =>
      contexts[actor].request.post(`/api/groups/${group}/loot`, {
        headers: { origin: "http://localhost:3000" },
        data,
      });
    const input = {
      title: "Weighted loot",
      configuration: {
        pool: 1000,
        expenses: [{ label: "Repairs", silver: 100 }],
        notes: "Manual proceeds",
        participants: [
          { userId: ids[0], shares: 1 },
          { userId: ids[2], shares: 2 },
        ],
      },
    };
    expect((await post(2, groupId, input)).status()).toBe(403);
    expect((await post(3, groupId, input)).status()).toBe(404);
    expect((await contexts[3].request.get(`/api/groups/${groupId}/loot`)).status()).toBe(404);
    expect(await db.groupLootSplit.count({ where: { groupId } })).toBe(0);
    await page.goto(`/groups/${slug}`);
    await page.getByRole("tab", { name: "Treasury", exact: true }).click();
    await page.getByLabel("Split name", { exact: true }).fill("Weighted loot");
    await page.getByLabel("Total loot pool (silver)", { exact: true }).fill("1000");
    await page.getByRole("button", { name: "Add expense", exact: true }).click();
    await page.getByLabel("Expense 1 description", { exact: true }).fill("Repairs");
    await page.getByLabel("Expense 1 silver", { exact: true }).fill("100");
    await page.getByLabel("Add loot participant", { exact: true }).selectOption(ids[2]);
    await page.getByLabel("Shares for Loot member", { exact: true }).fill("2");
    await expect(page.getByRole("region", { name: "Loot payout preview" })).toContainText(
      "300 silver",
    );
    await expect(page.getByRole("region", { name: "Loot payout preview" })).toContainText(
      "600 silver",
    );
    let failNextSave = true;
    await page.route(`**/api/groups/${groupId}/loot`, async (route) => {
      if (route.request().method() === "POST" && failNextSave) {
        failNextSave = false;
        await route.fulfill({ status: 503, json: { error: "Saving is temporarily unavailable." } });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Save loot split", exact: true }).click();
    await expect(page.locator(".team-loot-workspace").getByRole("alert")).toContainText(
      "Your draft is retained",
    );
    await expect(page.getByLabel("Total loot pool (silver)", { exact: true })).toHaveValue("1,000");
    expect(await db.groupLootSplit.count({ where: { groupId } })).toBe(0);
    await page.getByRole("button", { name: "Save loot split", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Loot split saved" })).toContainText(
      "revision 1",
    );
    const saved = await db.groupLootSplit.findFirstOrThrow({ where: { groupId } });
    expect(saved.version).toBe(1);
    expect(saved.createdById).toBe(ids[0]);
    const read = await contexts[2].request.get(`/api/groups/${groupId}/loot`);
    expect(read.ok()).toBe(true);
    expect(read.headers()["cache-control"]).toBe("private, no-store");
    const revised = await post(1, groupId, {
      ...input,
      id: saved.id,
      version: 1,
      title: "Officer revision",
    });
    expect(revised.ok()).toBe(true);
    await page.getByLabel("Split name", { exact: true }).fill("Unsaved stale team split");
    await page.getByRole("button", { name: "Save loot split", exact: true }).click();
    await expect(page.locator(".team-loot-workspace").getByRole("alert")).toContainText(
      "This loot split changed",
    );
    await expect(page.getByLabel("Split name", { exact: true })).toHaveValue(
      "Unsaved stale team split",
    );
    expect(
      (
        await post(0, groupId, { ...input, id: saved.id, version: 1, title: "Stale overwrite" })
      ).status(),
    ).toBe(409);
    expect((await db.groupLootSplit.findUniqueOrThrow({ where: { id: saved.id } })).title).toBe(
      "Officer revision",
    );
    const other = await db.group.create({
      data: {
        name: "Other loot team",
        slug: `other-${slug}`,
        description: "",
        region: "europe",
        ownerId: ids[0],
        members: { create: { userId: ids[0], role: "OWNER" } },
      },
    });
    otherId = other.id;
    expect((await post(0, otherId, { ...input, id: saved.id, version: 2 })).status()).toBe(409);
    expect(
      (
        await post(0, groupId, {
          ...input,
          configuration: {
            ...input.configuration,
            expenses: [{ label: "Too much", silver: 1001 }],
          },
        })
      ).status(),
    ).toBe(400);
    // Demoted: the officer loses the Officer role and with it Manage loot splits.
    await db.groupRoleAssignment.deleteMany({ where: { groupId, userId: ids[1] } });
    expect((await post(1, groupId, input)).status()).toBe(403);
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: ids[1] } } });
    expect((await contexts[1].request.get(`/api/groups/${groupId}/loot`)).status()).toBe(404);
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: ids[2] } } });
    expect((await post(0, groupId, input)).status()).toBe(409);
    expect(await db.groupLootSplit.count({ where: { groupId } })).toBe(1);
  } finally {
    for (const c of contexts.slice(1)) await c.close();
    if (otherId) await db.group.deleteMany({ where: { id: otherId } });
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test("guild tax: only Manage team sets it, a split takes it with % expenses, and paying credits the pot", async ({
  page,
  context,
  browser,
}) => {
  const ids = [`atlas-test-${randomUUID()}`, `atlas-test-${randomUUID()}`],
    contexts = [context, await browser.newContext({ baseURL: "http://localhost:3000" })];
  let groupId = "";
  try {
    for (let i = 0; i < 2; i++) {
      const token = randomUUID();
      await db.user.create({
        data: {
          id: ids[i],
          name: ["Tax owner", "Tax member"][i],
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      await contexts[i].addCookies([
        {
          name: "next-auth.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    const slug = `tax-${randomUUID().slice(0, 8)}`,
      team = await db.group.create({
        data: {
          name: "Guild tax QA",
          slug,
          description: "Isolated fixture",
          region: "europe",
          ownerId: ids[0],
          members: {
            create: [
              { userId: ids[0], role: "OWNER" },
              { userId: ids[1], role: "MEMBER" },
            ],
          },
        },
      });
    groupId = team.id;
    await seedTeamRoles(db, groupId);
    const profile = (actor: number, guildTaxPercent: number, updatedAt: Date) =>
      contexts[actor].request.post(`/api/groups/${groupId}/actions`, {
        headers: { origin: "http://localhost:3000" },
        data: {
          action: "profile",
          expectedUpdatedAt: updatedAt.toISOString(),
          name: "Guild tax QA",
          description: "Isolated fixture",
          region: "europe",
          visibility: "PRIVATE",
          guildTaxPercent,
        },
      });
    // A member without Manage team cannot set the tax; bad rates are refused.
    expect((await profile(1, 10, team.updatedAt)).status()).toBe(403);
    expect((await profile(0, 12.34, team.updatedAt)).status()).toBe(400);
    expect((await profile(0, 100.5, team.updatedAt)).status()).toBe(400);
    const guildTax = (actor: number, guildTaxPercent: number) =>
      contexts[actor].request.post(`/api/groups/${groupId}/actions`, {
        headers: { origin: "http://localhost:3000" },
        data: { action: "guild-tax", guildTaxPercent },
      });
    expect((await guildTax(1, 10)).status()).toBe(403);
    expect((await guildTax(0, 12.34)).status()).toBe(400);
    expect((await db.group.findUniqueOrThrow({ where: { id: groupId } })).guildTaxPercent).toBe(0);
    // With no rate yet, the leader sets it right in the loot split and the toggle appears on.
    await page.goto(`/groups/${slug}`);
    await page.getByRole("tab", { name: "Treasury", exact: true }).click();
    await page.getByLabel("Team guild tax (%)", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Set guild tax", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: /Guild tax/ })).toBeChecked();
    expect((await db.group.findUniqueOrThrow({ where: { id: groupId } })).guildTaxPercent).toBe(5);
    // The leader changes the rate from its own row in Settings, without opening the profile form.
    await page.goto(`/groups/${slug}`);
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    const rate = page.getByLabel("Guild tax (%)", { exact: true });
    await expect(rate).toBeVisible();
    await rate.fill("10");
    await page.getByRole("button", { name: "Save guild tax", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Guild tax saved" })).toBeVisible();
    expect((await db.group.findUniqueOrThrow({ where: { id: groupId } })).guildTaxPercent).toBe(10);
    await expect(rate).toHaveValue("10");
    // A split may only take the team's own rate.
    const odd = await contexts[0].request.post(`/api/groups/${groupId}/loot`, {
      headers: { origin: "http://localhost:3000" },
      data: {
        title: "Odd tax",
        configuration: {
          pool: 1000,
          notes: "",
          guildTaxPercent: 25,
          expenses: [],
          participants: [{ userId: ids[0], shares: 1 }],
        },
      },
    });
    expect(odd.status()).toBe(409);

    await page.goto(`/groups/${slug}`);
    await page.getByRole("tab", { name: "Treasury", exact: true }).click();
    const pool = page.getByLabel("Total loot pool (silver)", { exact: true });
    await expect(pool).toHaveValue("");
    await expect(pool).toHaveAttribute("placeholder", /e\.g\./);
    await page.getByLabel("Split name", { exact: true }).fill("Taxed haul");
    await pool.fill("1m");
    await expect(pool).toHaveValue("1,000,000");
    await page.getByRole("checkbox", { name: /Guild tax/ }).check();
    await page.getByRole("button", { name: "Add expense", exact: true }).click();
    await page.getByLabel("Expense 1 description", { exact: true }).fill("Caller");
    await page
      .getByRole("group", { name: "Expense 1 in" })
      .getByRole("button", { name: "%", exact: true })
      .click();
    await page.getByLabel("Expense 1 percent", { exact: true }).fill("5");
    const payout = page.getByRole("region", { name: "Loot payout preview" });
    // 1,000,000 − 10% guild tax (100,000) − 5% caller (50,000) = 850,000 shared.
    await expect(payout).toContainText("Guild tax · 10%");
    await expect(payout.getByRole("list", { name: "Taken before the share" })).toContainText(
      "−50,000 silver",
    );
    await expect(payout.locator("dl")).toContainText("850,000 silver");
    await page.getByRole("button", { name: "Save loot split", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Loot split saved" })).toBeVisible();
    const saved = await db.groupLootSplit.findFirstOrThrow({ where: { groupId } });
    expect(saved.configuration).toMatchObject({
      guildTaxPercent: 10,
      expenses: [{ label: "Caller", kind: "percent", percent: 5 }],
    });
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Pay into wallets", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "into the team pot" })).toBeVisible();
    const entries = await db.groupWalletEntry.findMany({
      where: { groupId, sourceId: `split:${saved.id}` },
      select: { userId: true, amount: true },
    });
    expect(entries.sort((a, b) => a.amount - b.amount)).toEqual([
      { userId: null, amount: 100000 },
      { userId: ids[0], amount: 850000 },
    ]);
  } finally {
    await contexts[1].close();
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
