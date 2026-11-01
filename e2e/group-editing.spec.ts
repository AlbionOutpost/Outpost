import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("private guild profiles, event revisions and calendar exports preserve permissions", async ({
  browser,
}) => {
  const contexts = await Promise.all(Array.from({ length: 3 }, () => browser.newContext())),
    ids = Array.from({ length: 3 }, () => `atlas-test-${randomUUID()}`);
  let groupId = "";
  try {
    for (let n = 0; n < 3; n++) {
      const token = randomUUID();
      await db.user.create({
        data: {
          id: ids[n],
          name: `Event tester ${n}`,
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      await contexts[n].addCookies([
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
    const group = await db.group.create({
      data: {
        name: "Private editing guild",
        slug: `edit-${randomUUID().slice(0, 8)}`,
        description: "Private fixture",
        region: "europe",
        visibility: "PRIVATE",
        ownerId: ids[0],
        members: {
          create: [
            { userId: ids[0], role: "OWNER" },
            { userId: ids[1], role: "MEMBER" },
          ],
        },
      },
    });
    groupId = group.id;
    const action = (n: number, data: unknown) =>
      contexts[n].request.post(`/api/groups/${groupId}/actions`, {
        headers: { origin: "http://localhost:3000" },
        data,
      });
    const profile = {
      action: "profile",
      expectedUpdatedAt: group.updatedAt.toISOString(),
      name: "Edited private guild",
      description: "Updated group description",
      region: "asia",
      visibility: "PRIVATE",
    };
    expect((await action(1, profile)).status()).toBe(403);
    expect((await action(2, profile)).status()).toBe(404);
    const page = await contexts[0].newPage();
    await page.goto(`/groups/${group.slug}`);
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    await page.getByText("Edit team profile", { exact: true }).click();
    await page.getByLabel("Team profile name", { exact: true }).fill(profile.name);
    await page.getByRole("button", { name: "Save team profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: profile.name, exact: true })).toBeVisible();
    expect((await action(0, profile)).status()).toBe(409);
    const eventInput = {
      action: "event",
      title: "Original group event",
      description: "Group plans",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      timezone: "Europe/Berlin",
      expectedParticipants: 20,
      voiceInfo: "Team voice",
      compositionId: null,
    };
    expect((await action(0, eventInput)).status()).toBe(200);
    const event = await db.groupEvent.findFirstOrThrow({ where: { groupId } });
    const url = `/api/groups/${groupId}/events/${event.id}/calendar`;
    expect((await contexts[2].request.get(url)).status()).toBe(404);
    const exported = await contexts[1].request.get(url);
    expect(exported.status()).toBe(200);
    expect(exported.headers()["content-type"]).toContain("text/calendar");
    expect(await exported.text()).toContain(`UID:${event.id}@albion-atlas`);
    await page.reload();
    await page.getByRole("tab", { name: "Events", exact: true }).click();
    await page.getByText("Edit event", { exact: true }).click();
    await page.getByLabel("Edit event title", { exact: true }).fill("Revised group event");
    await page.getByRole("button", { name: "Save event revision", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Revised group event", exact: true }),
    ).toBeVisible();
    expect((await db.groupEvent.findUniqueOrThrow({ where: { id: event.id } })).version).toBe(2);
    expect(
      (
        await action(0, { ...eventInput, action: "edit-event", eventId: event.id, version: 1 })
      ).status(),
    ).toBe(409);
    expect(
      (
        await action(1, { ...eventInput, action: "edit-event", eventId: event.id, version: 2 })
      ).status(),
    ).toBe(403);
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: ids[1] } } });
    expect((await contexts[1].request.get(url)).status()).toBe(404);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
