import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
import { seedTeamRoles } from "../src/lib/groups/roles";
const db = createTestDb();

/** A datetime-local value in the browser's (and this machine's) local time. */
function localInput(at: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}
async function signIn(context: BrowserContext, id: string, name: string, role = "USER") {
  const token = randomUUID();
  await db.user.create({
    data: {
      id,
      name,
      role,
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 900_000) } },
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
}
/** Entries close: move the deadline into the past (the service refuses to set one there). */
const closeEntries = (id: string) =>
  db.giveaway.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });

test("site-wide giveaway: staff start it, players enter once, the draw runs once after the deadline", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  const origin = baseURL || "http://localhost:3000";
  const ids = ["staff", "first", "second"].map((who) => `atlas-test-${who}-${randomUUID()}`);
  const names = ["Giveaway staff", `Winner ${ids[1].slice(-6)}`, `Winner ${ids[2].slice(-6)}`];
  const title = `Mount giveaway ${randomUUID().slice(0, 8)}`;
  const contexts: BrowserContext[] = [context];
  for (let i = 1; i < 3; i++) contexts.push(await browser.newContext({ baseURL: origin }));
  const guest = await browser.newContext({ baseURL: origin });
  let giveawayId = "";
  try {
    for (let i = 0; i < 3; i++) await signIn(contexts[i], ids[i], names[i], i ? "USER" : "ADMIN");
    const post = (actor: number, data: unknown, headers: Record<string, string> = { origin }) =>
      contexts[actor].request.post("/api/giveaways", { headers, data });

    // A player cannot start one; nothing is written.
    const draft = {
      action: "create",
      title,
      prize: "One T8 Swiftclaw",
      region: "europe",
      winnerCount: 2,
      closesAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    expect((await post(1, draft)).status()).toBe(403);
    expect(await db.giveaway.count({ where: { title } })).toBe(0);

    // Staff start it on the page.
    await page.goto("/giveaways");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("giveaways");
    // One start action on the page, whether or not any giveaway is open.
    const start = page.getByRole("button", { name: "Start a giveaway" });
    await expect(start).toHaveCount(1);
    await start.click();
    const dialog = page.getByRole("dialog", { name: "Start a giveaway" });
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Prize").fill("One T8 Swiftclaw each");
    await dialog.getByLabel("Winners").fill("2");
    await dialog
      .getByLabel("Entries close (your device time)")
      .fill(localInput(new Date(Date.now() + 3_600_000)));
    await dialog.getByText("Gold trophy").click();
    await dialog.getByLabel("Rules (optional)").fill("One entry per Discord account.");
    await dialog.getByRole("button", { name: "Start giveaway" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Giveaway started." })).toBeVisible();
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: title }) });
    await expect(card).toContainText("Europe server");
    await expect(card).toContainText("2 winners");
    const row = await db.giveaway.findFirstOrThrow({ where: { title } });
    giveawayId = row.id;
    expect(row).toMatchObject({ groupId: null, image: "trophy-gold", createdById: ids[0] });

    // The card shows the countdown, entrants and winners, and still one start action.
    await expect(card).toContainText("left to enter");
    await expect(card).toContainText("0 entrants");
    await expect(page.getByRole("button", { name: "Start a giveaway" })).toHaveCount(1);

    // A guest sees the giveaway and a sign-in that comes back here, and no start action.
    const guestPage = await guest.newPage();
    await guestPage.goto("/giveaways");
    await expect(guestPage.getByRole("button", { name: "Start a giveaway" })).toHaveCount(0);
    const guestCard = guestPage
      .getByRole("listitem")
      .filter({ has: guestPage.getByRole("heading", { name: title }) });
    const signInLink = guestCard.getByRole("link", { name: "Sign in to enter" });
    await expect(signInLink).toHaveAttribute("href", "/signin?callbackUrl=%2Fgiveaways");
    expect(
      (
        await guest.request.post("/api/giveaways", {
          headers: { origin },
          data: { action: "enter", id: giveawayId },
        })
      ).status(),
    ).toBe(401);

    // The first player enters on the page; the second through the API. Entering twice is refused.
    const player = await contexts[1].newPage();
    await player.goto("/giveaways");
    const playerCard = player
      .getByRole("listitem")
      .filter({ has: player.getByRole("heading", { name: title }) });
    await playerCard.getByRole("button", { name: `Enter ${title}` }).click();
    await expect(playerCard.getByText("You are entered")).toBeVisible();
    expect((await post(2, { action: "enter", id: giveawayId })).ok()).toBe(true);
    expect((await post(2, { action: "enter", id: giveawayId })).status()).toBe(409);
    expect(
      (
        await post(2, { action: "enter", id: giveawayId }, { origin: "https://evil.invalid" })
      ).status(),
    ).toBe(403);
    expect(await db.giveawayEntry.count({ where: { giveawayId } })).toBe(2);

    // No draw before the deadline, and never by a player; a forged winner list is refused.
    expect((await post(0, { action: "draw", id: giveawayId })).status()).toBe(409);
    expect((await post(1, { action: "draw", id: giveawayId })).status()).toBe(403);
    expect((await post(0, { action: "draw", id: giveawayId, winners: [ids[1]] })).status()).toBe(
      400,
    );

    await closeEntries(giveawayId);
    expect((await post(1, { action: "leave", id: giveawayId })).status()).toBe(409);
    expect((await post(0, { action: "enter", id: giveawayId })).status()).toBe(409);

    // Staff draw on the page; the winners show by display name.
    await page.reload();
    const staffCard = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: title }) });
    await expect(staffCard).toContainText("Entries closed");
    await staffCard.getByRole("button", { name: `Draw winners for ${title}` }).click();
    await staffCard.getByRole("button", { name: "Confirm: draw 2 winners" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Winners drawn" })).toBeVisible();
    await expect(staffCard.getByText(names[1])).toBeVisible();
    await expect(staffCard.getByText(names[2])).toBeVisible();
    const drawn = await db.giveaway.findUniqueOrThrow({ where: { id: giveawayId } });
    expect(drawn).toMatchObject({ status: "DRAWN", drawnById: ids[0] });
    expect(drawn.drawnAt).toBeInstanceOf(Date);
    const places = await db.giveawayEntry.findMany({
      where: { giveawayId },
      orderBy: { winnerPosition: "asc" },
      select: { userId: true, winnerPosition: true },
    });
    expect(places.map((p) => p.winnerPosition)).toEqual([1, 2]);

    // A second draw returns the first result and changes nothing.
    const again = await (await post(0, { action: "draw", id: giveawayId })).json();
    expect(again.alreadyDrawn).toBe(true);
    const shown = again.board.giveaways.find((g: { id: string }) => g.id === giveawayId);
    expect(shown.winners.map((w: { name: string }) => w.name)).toEqual(
      places.map((p) => names[ids.indexOf(p.userId)]),
    );
    expect((await post(0, { action: "cancel", id: giveawayId })).status()).toBe(409);

    // Each winner sees their own place.
    await player.reload();
    await expect(playerCard.getByText(/You won · (1st|2nd)/)).toBeVisible();
  } finally {
    for (const c of contexts.slice(1)) await c.close();
    await guest.close();
    if (giveawayId) await db.giveaway.deleteMany({ where: { id: giveawayId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});

test("team giveaway: members only, Manage giveaways to run and draw, leavers excluded", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  const origin = baseURL || "http://localhost:3000";
  const roles = ["owner", "admin", "officer", "member", "outsider"];
  const ids = roles.map((who) => `atlas-test-${who}-${randomUUID()}`);
  const contexts: BrowserContext[] = [context];
  for (let i = 1; i < roles.length; i++)
    contexts.push(await browser.newContext({ baseURL: origin }));
  let groupId = "";
  try {
    for (let i = 0; i < roles.length; i++)
      await signIn(contexts[i], ids[i], `Team ${roles[i]} ${ids[i].slice(-4)}`);
    const slug = `raffle-${randomUUID().slice(0, 8)}`;
    const team = await db.group.create({
      data: {
        name: "Giveaway QA",
        slug,
        description: "Isolated fixture",
        region: "americas",
        visibility: "PRIVATE",
        ownerId: ids[0],
        members: {
          create: ids.slice(0, 4).map((userId, i) => ({
            userId,
            role: (["OWNER", "ADMIN", "OFFICER", "MEMBER"] as const)[i],
          })),
        },
      },
    });
    groupId = team.id;
    await seedTeamRoles(db, groupId);
    const post = (actor: number, data: unknown) =>
      contexts[actor].request.post(`/api/groups/${groupId}/giveaways`, {
        headers: { origin },
        data,
      });
    const draft = {
      action: "create",
      title: "Team silver raffle",
      prize: "2m silver from the team pot",
      region: "americas",
      winnerCount: 3,
      closesAt: new Date(Date.now() + 3_600_000).toISOString(),
    };

    // An outsider learns nothing; members without Manage giveaways cannot start one.
    expect((await contexts[4].request.get(`/api/groups/${groupId}/giveaways`)).status()).toBe(404);
    expect((await post(4, draft)).status()).toBe(404);
    expect((await post(3, draft)).status()).toBe(403);
    expect((await post(2, draft)).status()).toBe(403);
    expect(await db.giveaway.count({ where: { groupId } })).toBe(0);

    // The migrated Admin role carries Manage giveaways.
    const created = await (await post(1, draft)).json();
    const id = created.id as string;
    expect(id).toBeTruthy();
    expect((await post(4, { action: "enter", id })).status()).toBe(404);
    // A team giveaway is not reachable through the site-wide route.
    expect(
      (
        await contexts[3].request.post("/api/giveaways", {
          headers: { origin },
          data: { action: "enter", id },
        })
      ).status(),
    ).toBe(404);
    for (const actor of [0, 2, 3])
      expect((await post(actor, { action: "enter", id })).ok()).toBe(true);
    expect((await post(3, { action: "enter", id })).status()).toBe(409);
    expect(await db.giveawayEntry.count({ where: { giveawayId: id } })).toBe(3);

    // The officer leaves the team before the draw.
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: ids[2] } } });
    await closeEntries(id);
    expect((await post(1, { action: "enter", id })).status()).toBe(409);
    expect((await post(3, { action: "draw", id })).status()).toBe(403);
    expect((await post(2, { action: "draw", id })).status()).toBe(404);

    const first = await (await post(1, { action: "draw", id })).json();
    const winners = first.board.giveaways.find((g: { id: string }) => g.id === id).winners;
    expect(winners.map((w: { name: string }) => w.name).sort()).toEqual(
      [`Team owner ${ids[0].slice(-4)}`, `Team member ${ids[3].slice(-4)}`].sort(),
    );
    const again = await (await post(0, { action: "draw", id })).json();
    expect(again.alreadyDrawn).toBe(true);
    expect(again.board.giveaways.find((g: { id: string }) => g.id === id).winners).toEqual(winners);
    expect(
      (await db.giveawayEntry.findFirstOrThrow({ where: { giveawayId: id, userId: ids[2] } }))
        .winnerPosition,
    ).toBeNull();
    expect(await db.giveaway.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "DRAWN",
      drawnById: ids[1],
    });

    // Members see it under the team's announcements, with the winners.
    await page.goto(`/groups/${slug}#team-announcements`);
    const card = page
      .locator("#team-giveaways")
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Team silver raffle" }) });
    await expect(card).toContainText("Americas server");
    await expect(
      page.locator("#team-giveaways").getByRole("button", { name: "Start a giveaway" }),
    ).toHaveCount(1);
    await expect(card.getByText(`Team member ${ids[3].slice(-4)}`)).toBeVisible();
    await expect(card.getByText(/You won · (1st|2nd)/)).toBeVisible();
  } finally {
    for (const c of contexts.slice(1)) await c.close();
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
