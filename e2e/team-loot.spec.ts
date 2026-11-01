import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
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
    await page.getByRole("tab", { name: "Loot splits", exact: true }).click();
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
    await expect(page.getByLabel("Total loot pool (silver)", { exact: true })).toHaveValue("1000");
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
    await db.groupMember.update({
      where: { groupId_userId: { groupId, userId: ids[1] } },
      data: { role: "MEMBER" },
    });
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
test.afterAll(() => db.$disconnect());
