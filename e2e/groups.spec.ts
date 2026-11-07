import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("guild invitations, requests, roles, resources, events and ownership enforce independent-account permissions", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  const ids = Array.from({ length: 5 }, () => `atlas-test-${randomUUID()}`);
  const clients = [context];
  const anonymous = await browser.newContext({ baseURL: "http://localhost:3000" });
  for (let i = 1; i < 5; i++)
    clients.push(await browser.newContext({ baseURL: "http://localhost:3000" }));
  let groupId = "";
  const roleId = async (name: string) =>
    (await db.groupCustomRole.findFirstOrThrow({ where: { groupId, name } })).id;
  const held = async (userId: string) =>
    (
      await db.groupRoleAssignment.findMany({
        where: { groupId, userId },
        select: { role: { select: { name: true } } },
      })
    )
      .map((a) => a.role.name)
      .sort();
  const action = (i: number, data: Record<string, unknown>) =>
    clients[i].request.post(`/api/groups/${groupId}/actions`, {
      headers: { origin: "http://localhost:3000" },
      data,
    });
  try {
    for (let i = 0; i < 5; i++) {
      const token = randomUUID();
      await db.user.create({
        data: {
          id: ids[i],
          name: `Guild tester ${i}`,
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      await clients[i].addCookies([
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
    const slug = `guild-${randomUUID().slice(0, 8)}`;
    await page.goto("/groups/new");
    // The founding steps: the address follows the name until it is edited, and Next refuses
    // a short name; every answer survives Back.
    const next = page.getByRole("button", { name: /^Next:/ });
    await page.getByLabel("Team name").fill("Verified guild workflows");
    await expect(page.getByLabel("Workspace address")).toHaveValue("verified-guild-workflows");
    await page.getByLabel("Workspace address").fill(slug);
    await page.getByLabel("Team name").fill("Verified guild workflows");
    await expect(page.getByLabel("Workspace address")).toHaveValue(slug);
    await next.click();
    await expect(page.getByRole("heading", { name: "Raise your banner" })).toBeFocused();
    await page.getByRole("radio", { name: "Teal", exact: true }).check();
    await page.getByRole("radio", { name: "Wolf", exact: true }).check();
    await next.click();
    await page.getByRole("checkbox", { name: "ZvZ", exact: true }).check();
    await next.click();
    await page.getByRole("radio", { name: "Public", exact: true }).check();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "ZvZ", exact: true })).toBeChecked();
    await next.click();
    await expect(page.getByRole("radio", { name: "Public", exact: true })).toBeChecked();
    await next.click();
    await page.getByRole("button", { name: "Found the team", exact: true }).click();
    await page.getByRole("link", { name: "Enter the workspace" }).click();
    await expect(
      page.getByRole("heading", { name: "Verified guild workflows", exact: true }),
    ).toBeVisible();
    const founded = await db.group.findUniqueOrThrow({ where: { slug } });
    expect([founded.crestColor, founded.crestItem, founded.activities, founded.visibility]).toEqual(
      ["teal", "wolf", ",ZvZ,", "PUBLIC"],
    );
    groupId = founded.id;
    expect((await action(0, { action: "leave" })).status()).toBe(409);
    // A new team starts with Admin, Officer and the default Member; outsiders get a 404.
    expect(
      (
        await db.groupCustomRole.findMany({ where: { groupId }, orderBy: { position: "desc" } })
      ).map((r) => [r.name, r.isDefault]),
    ).toEqual([
      ["Admin", false],
      ["Officer", false],
      ["Member", true],
    ]);
    expect(
      (await action(4, { action: "member-roles", userId: ids[4], roleIds: [] })).status(),
    ).toBe(404);
    expect(
      (
        await action(4, { action: "role-create", name: "Spy", color: "red", permissions: [] })
      ).status(),
    ).toBe(404);
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Create invitation", exact: true }).click();
    const link = page.getByLabel("New invitation link");
    await expect(link).toHaveValue(/invitations\//);
    const inviteUrl = await link.inputValue();
    const token = inviteUrl.split("/").pop()!;
    const invite = await db.groupInvitation.findFirstOrThrow({ where: { groupId } });
    expect(invite.tokenHash).not.toBe(token);
    expect(invite.tokenHash).toHaveLength(64);
    const invitationPath = new URL(inviteUrl).pathname;
    const anonymousPage = await anonymous.newPage();
    await anonymousPage.goto(inviteUrl);
    const signInLink = anonymousPage.getByRole("link", {
      name: "Sign in to join this team",
      exact: true,
    });
    await expect(signInLink).toHaveAttribute(
      "href",
      `/signin?${new URLSearchParams({ callbackUrl: invitationPath })}`,
    );
    await signInLink.click();
    await expect(anonymousPage).toHaveURL(
      (url) => url.pathname === "/signin" && url.searchParams.get("callbackUrl") === invitationPath,
    );
    expect(
      (
        await anonymous.request.post(`/api/invitations/${token}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (await db.groupInvitation.findUniqueOrThrow({ where: { id: invite.id } })).acceptedAt,
    ).toBeNull();
    const officerPage = await clients[2].newPage();
    await officerPage.goto(
      `/signin?error=OAuthCallback&callbackUrl=${encodeURIComponent("http://localhost:3000" + invitationPath)}`,
    );
    await expect(officerPage).toHaveURL((url) => url.pathname === invitationPath);
    expect(await db.groupMember.count({ where: { groupId, userId: ids[2] } })).toBe(0);
    await officerPage.getByRole("button", { name: "Accept invitation" }).click();
    await expect(
      officerPage.getByRole("heading", { name: "Verified guild workflows", exact: true }),
    ).toBeVisible();
    expect(
      (
        await clients[4].request.post(`/api/invitations/${token}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(410);
    await page.reload();
    await page.getByRole("tab", { name: "Members", exact: true }).click();
    // An invited player joins with the default role; the owner adds Officer from the roster.
    expect(await held(ids[2])).toEqual(["Member"]);
    await page.getByRole("button", { name: "Roles for Guild tester 2" }).click();
    await page.getByRole("checkbox", { name: /Officer/ }).check();
    await page.getByRole("button", { name: "Save roles" }).click();
    await expect.poll(() => held(ids[2])).toEqual(["Member", "Officer"]);
    const adminInvite = await (await action(0, { action: "invite", hours: 24 })).json();
    expect(
      (
        await clients[1].request.post(`/api/invitations/${adminInvite.path.split("/").pop()}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await action(0, {
          action: "member-roles",
          userId: ids[1],
          roleIds: [await roleId("Admin"), await roleId("Member")],
        })
      ).status(),
    ).toBe(200);
    // A public team that has closed its roster refuses new requests and queues nothing.
    await db.group.update({ where: { id: groupId }, data: { recruiting: false } });
    expect((await action(3, { action: "request", message: "Closed roster" })).status()).toBe(409);
    expect(await db.groupMembershipRequest.count({ where: { groupId } })).toBe(0);
    await db.group.update({ where: { id: groupId }, data: { recruiting: true } });
    const memberPage = await clients[3].newPage();
    await memberPage.goto(`/groups/${slug}`);
    await memberPage.getByLabel("Message to team leaders").fill("I would like to join the roster");
    await memberPage.getByRole("button", { name: "Request membership" }).click();
    await expect(memberPage.getByRole("status")).toContainText("Membership request saved");
    await page.reload();
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Approve Guild tester 3" }).click();
    await expect.poll(() => db.groupMember.count({ where: { groupId, userId: ids[3] } })).toBe(1);
    expect(await held(ids[3])).toEqual(["Member"]);
    const admin = await roleId("Admin");
    // Without Manage roles nobody hands out roles, not even to themselves.
    expect(
      (await action(3, { action: "member-roles", userId: ids[3], roleIds: [admin] })).status(),
    ).toBe(403);
    expect(
      (await action(1, { action: "member-roles", userId: ids[3], roleIds: [admin] })).status(),
    ).toBe(403);
    expect((await action(2, { action: "remove", userId: ids[3] })).status()).toBe(403);
    expect(
      (
        await action(3, {
          action: "profile",
          expectedUpdatedAt: new Date().toISOString(),
          name: "Hijacked",
          description: "",
          region: "europe",
          visibility: "PUBLIC",
        })
      ).status(),
    ).toBe(403);
    // A recruiter role below Officer with Manage roles: the officer may now hand out roles,
    // but only those below their own, and grant only permissions they hold.
    const recruiter = await (
      await action(0, {
        action: "role-create",
        name: "Recruiter",
        color: "green",
        permissions: ["manageRoles", "inviteMembers"],
      })
    ).json();
    expect(
      (
        await action(0, {
          action: "member-roles",
          userId: ids[2],
          roleIds: [await roleId("Officer"), await roleId("Member"), recruiter.id],
        })
      ).status(),
    ).toBe(200);
    expect(
      (await action(2, { action: "member-roles", userId: ids[3], roleIds: [admin] })).status(),
    ).toBe(403);
    expect(
      (await action(2, { action: "member-roles", userId: ids[1], roleIds: [] })).status(),
    ).toBe(403);
    expect(
      (
        await action(2, {
          action: "role-update",
          roleId: await roleId("Officer"),
          name: "Boss",
          color: "red",
          permissions: [],
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await action(2, {
          action: "role-create",
          name: "Usurper",
          color: "red",
          permissions: ["manageTeam"],
        })
      ).status(),
    ).toBe(403);
    expect((await action(2, { action: "role-delete", roleId: admin })).status()).toBe(403);
    // Moving a role among those below you works; past your own role it does not.
    expect(
      (await action(2, { action: "role-move", roleId: recruiter.id, direction: "up" })).status(),
    ).toBe(200);
    expect(
      (await action(2, { action: "role-move", roleId: recruiter.id, direction: "up" })).status(),
    ).toBe(403);
    expect(await held(ids[3])).toEqual(["Member"]);
    expect(
      (await db.groupCustomRole.findUniqueOrThrow({ where: { id: await roleId("Officer") } }))
        .permissions,
    ).toBe(996); // the Officer's old rights plus Manage wallet, which came with Manage loot splits
    const caller = await action(2, {
      action: "role-create",
      name: "Caller",
      color: "violet",
      permissions: ["inviteMembers"],
    });
    expect(caller.status()).toBe(200);
    const callerId = (await caller.json()).id;
    expect(
      (
        await action(2, {
          action: "member-roles",
          userId: ids[3],
          roleIds: [await roleId("Member"), callerId],
        })
      ).status(),
    ).toBe(200);
    expect(await held(ids[3])).toEqual(["Caller", "Member"]);
    // The default role cannot be deleted; an ordinary one can, and its holders lose it.
    expect(
      (await action(0, { action: "role-delete", roleId: await roleId("Member") })).status(),
    ).toBe(409);
    expect((await action(2, { action: "role-delete", roleId: callerId })).status()).toBe(200);
    expect(await held(ids[3])).toEqual(["Member"]);
    await officerPage.reload();
    await officerPage.getByRole("tab", { name: "Announcements", exact: true }).click();
    await officerPage.getByLabel("Announcement title").fill("Secret group strategy");
    await officerPage.getByLabel("Announcement text").fill("Member-only engagement notes");
    await officerPage.getByRole("button", { name: "Publish announcement" }).click();
    await expect(officerPage.getByRole("heading", { name: "Secret group strategy" })).toBeVisible();
    const outsider = await (await clients[4].request.get(`/api/groups/${groupId}`)).json();
    expect(outsider.dashboard).toBeUndefined();
    expect(JSON.stringify(outsider)).not.toContain("Secret group strategy");
    expect(
      (await action(4, { action: "announcement", title: "Intrusion", body: "Denied" })).status(),
    ).toBe(404);
    const sourceBuild = await db.build.create({
      data: {
        authorId: ids[0],
        title: "Private source loadout",
        description: "",
        region: "europe",
        contentType: "ZvZ",
        strategy: "",
        patchNotes: "",
        equipment: {
          create: {
            slot: "Main hand",
            itemId: "T6_MAIN_AXE",
            quality: 1,
            abilities: "",
            alternatives: "",
          },
        },
      },
    });
    await page.reload();
    await page.getByRole("tab", { name: "Builds", exact: true }).click();
    await page.getByLabel("Build to share").selectOption(sourceBuild.id);
    await page.getByRole("button", { name: "Share build snapshot" }).click();
    await expect(page.getByRole("heading", { name: "Private source loadout" })).toBeVisible();
    expect((await action(3, { action: "share-build", buildId: sourceBuild.id })).status()).toBe(
      403,
    );
    await officerPage.getByRole("tab", { name: "Events", exact: true }).click();
    await officerPage.getByRole("button", { name: "New event", exact: true }).click();
    await officerPage.getByLabel("Event title").fill("Guild training operation");
    const tomorrowLocal = await officerPage.evaluate(() => {
      const tomorrow = new Date(Date.now() + 86400000);
      return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    });
    await officerPage.getByLabel("Start time (your device local time)").fill(tomorrowLocal);
    await officerPage.getByRole("button", { name: "Schedule event" }).click();
    await expect(
      officerPage.getByRole("heading", { name: "Guild training operation" }),
    ).toBeVisible();
    await memberPage.reload();
    await memberPage.getByRole("tab", { name: "Events", exact: true }).click();
    await memberPage.getByLabel("RSVP for Guild training operation").selectOption("MAYBE");
    await memberPage.getByLabel("Your role", { exact: true }).fill("Healer");
    await memberPage.getByRole("button", { name: "Save RSVP" }).click();
    await expect(
      memberPage.getByText("Guild tester 3 · Maybe · Healer", { exact: true }),
    ).toBeVisible();
    expect(
      await db.eventRSVP.count({ where: { userId: ids[3], status: "MAYBE", role: "Healer" } }),
    ).toBe(1);
    const expired = await (await action(0, { action: "invite", hours: 1 })).json();
    await db.groupInvitation.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (
        await clients[4].request.post(`/api/invitations/${expired.path.split("/").pop()}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(410);
    const revoked = await (await action(0, { action: "invite", hours: 1 })).json();
    expect((await action(0, { action: "revoke", invitationId: revoked.id })).status()).toBe(200);
    expect(
      (
        await clients[4].request.post(`/api/invitations/${revoked.path.split("/").pop()}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(410);
    const adminPage = await clients[1].newPage();
    await adminPage.goto(`/groups/${slug}`);
    await adminPage.getByRole("tab", { name: "Events", exact: true }).click();
    await adminPage.getByRole("button", { name: "Cancel event" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "Guild training operation · Cancelled" }),
    ).toBeVisible();
    expect((await action(0, { action: "transfer", userId: ids[1] })).status()).toBe(200);
    expect((await db.group.findUniqueOrThrow({ where: { id: groupId } })).ownerId).toBe(ids[1]);
    // The previous owner keeps the team's highest role.
    expect(await held(ids[0])).toEqual(["Admin"]);
    expect((await action(1, { action: "leave" })).status()).toBe(409);
    expect((await action(0, { action: "leave" })).status()).toBe(200);
    expect(
      (
        await action(0, { action: "announcement", title: "No longer member", body: "Denied" })
      ).status(),
    ).toBe(404);
    await adminPage.setViewportSize({ width: 375, height: 844 });
    await mkdir(".qa/screenshots", { recursive: true });
    await adminPage.reload();
    await adminPage.screenshot({ path: ".qa/screenshots/group-dashboard-375.png", fullPage: true });
    expect(
      await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await anonymous.close();
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    for (const client of clients.slice(1)) await client.close();
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
