import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
import { seedTeamRoles } from "../src/lib/groups/roles";
const db = createTestDb();
const key = () => randomUUID().replaceAll("-", "");

test("team wallet, coin flips and loot rolls: server outcomes, permissions and one roll each", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  const origin = baseURL || "http://localhost:3000";
  const ids = Array.from({ length: 4 }, () => `atlas-test-${randomUUID()}`);
  const contexts: BrowserContext[] = [context];
  for (let i = 1; i < 4; i++) contexts.push(await browser.newContext({ baseURL: origin }));
  let groupId = "";
  try {
    for (let i = 0; i < 4; i++) {
      const token = randomUUID();
      await db.user.create({
        data: {
          id: ids[i],
          name: ["Purse owner", "Purse officer", "Purse member", "Purse outsider"][i],
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
    const slug = `purse-${randomUUID().slice(0, 8)}`;
    const team = await db.group.create({
      data: {
        name: "Team economy QA",
        slug,
        description: "Isolated fixture",
        region: "europe",
        visibility: "PRIVATE",
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
    await seedTeamRoles(db, groupId);
    const post = (actor: number, path: string, data: unknown) =>
      contexts[actor].request.post(`/api/groups/${groupId}/${path}`, {
        headers: { origin },
        data,
      });
    const get = (actor: number, path: string) =>
      contexts[actor].request.get(`/api/groups/${groupId}/${path}`);
    const entries = () => db.groupWalletEntry.count({ where: { groupId } });

    // Denied: a member cannot credit, an outsider sees nothing, nothing is written.
    const credit = { action: "credit", target: ids[2], amount: 5000, reason: "Ganking share" };
    expect((await post(2, "wallet", { ...credit, key: key() })).status()).toBe(403);
    expect((await post(3, "wallet", { ...credit, key: key() })).status()).toBe(404);
    expect((await get(3, "wallet")).status()).toBe(404);
    expect((await get(3, "games")).status()).toBe(404);
    expect((await post(3, "games", { action: "call", key: key(), call: "heads" })).status()).toBe(
      404,
    );
    expect(await entries()).toBe(0);
    // A forged outcome is refused outright.
    expect(
      (
        await post(2, "games", { action: "call", key: key(), call: "heads", outcome: "heads" })
      ).status(),
    ).toBe(400);

    // The officer (Manage wallet through the migrated Officer role) credits; a retry books once.
    const once = key();
    expect((await post(1, "wallet", { ...credit, key: once })).ok()).toBe(true);
    expect((await post(1, "wallet", { ...credit, key: once })).ok()).toBe(true);
    expect(await entries()).toBe(1);
    expect(
      (
        await post(1, "wallet", {
          action: "debit",
          key: key(),
          target: ids[2],
          amount: 9000,
          reason: "x",
        })
      ).status(),
    ).toBe(409);
    const mine = await (await get(2, "wallet")).json();
    expect(mine.wallet).toMatchObject({ canManage: false, balance: 5000, members: null });

    // Flips: the outcome comes from the server and a retried request never throws again.
    const flipKey = key();
    const first = await (
      await post(2, "games", { action: "call", key: flipKey, call: "tails" })
    ).json();
    const again = await (
      await post(2, "games", { action: "call", key: flipKey, call: "heads" })
    ).json();
    expect(["heads", "tails"]).toContain(first.flip.outcome);
    expect(again.flip).toMatchObject({
      id: first.flip.id,
      outcome: first.flip.outcome,
      call: "tails",
    });
    expect(await db.groupCoinFlip.count({ where: { groupId } })).toBe(1);

    // A staked flip waits for the other player, then moves the stake inside the same write.
    const offer = await (
      await post(2, "games", {
        action: "flip",
        key: key(),
        headsId: ids[2],
        tailsId: ids[1],
        stake: 2000,
      })
    ).json();
    expect(offer.flip.status).toBe("PENDING");
    expect(
      (await post(2, "games", { action: "flip-accept", flipId: offer.flip.id })).status(),
    ).toBe(403);
    expect(
      (await post(1, "games", { action: "flip-accept", flipId: offer.flip.id })).status(),
    ).toBe(409);
    await post(0, "wallet", {
      action: "credit",
      key: key(),
      target: ids[1],
      amount: 2000,
      reason: "Stake",
    });
    const settled = await (
      await post(1, "games", { action: "flip-accept", flipId: offer.flip.id })
    ).json();
    expect(settled.flip.status).toBe("SETTLED");
    const stakes = await db.groupWalletEntry.findMany({ where: { groupId, kind: "flip" } });
    expect(stakes.map((e) => e.amount).sort()).toEqual([-2000, 2000]);
    expect(stakes.find((e) => e.amount > 0)?.userId).toBe(settled.flip.winnerId);

    // Loot rolls: a member cannot open one; everyone rolls once; the server names the winner.
    expect(
      (await post(2, "games", { action: "roll-open", key: key(), title: "Drop" })).status(),
    ).toBe(403);
    const opened = await (
      await post(1, "games", {
        action: "roll-open",
        key: key(),
        title: "Bloodletter",
        silver: 1001,
      })
    ).json();
    const rollId = opened.roll.id;
    const rolled = await (await post(2, "games", { action: "roll", rollId })).json();
    expect(rolled.value).toBeGreaterThanOrEqual(1);
    expect(rolled.value).toBeLessThanOrEqual(100);
    const twice = await post(2, "games", { action: "roll", rollId });
    expect(twice.status()).toBe(409);
    expect((await twice.json()).error).toContain(`already rolled ${rolled.value}`);
    expect((await post(3, "games", { action: "roll", rollId })).status()).toBe(404);
    expect((await post(2, "games", { action: "roll", rollId, value: 100 })).status()).toBe(400);
    expect(await db.groupLootRollEntry.count({ where: { rollId } })).toBe(1);
    await post(1, "games", { action: "roll", rollId });
    expect((await post(2, "games", { action: "roll-close", rollId })).status()).toBe(403);
    const closed = await (await post(1, "games", { action: "roll-close", rollId })).json();
    const rows = await db.groupLootRollEntry.findMany({ where: { rollId } });
    const top = Math.max(...rows.map((r) => r.value));
    expect(rows.find((r) => r.userId === closed.roll.winnerId)?.value).toBe(top);
    const shares = await db.groupWalletEntry.findMany({ where: { groupId, kind: "roll" } });
    expect(shares.reduce((t, e) => t + e.amount, 0)).toBe(1001);

    // Happy path in the browser: book a credit, then flip a coin (reduced motion: instant).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/groups/${slug}`);
    await page.getByRole("tab", { name: "Wallet", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
    await expect(page.getByText(/Outpost holds no money/).first()).toBeVisible();
    await page.getByRole("combobox", { name: "Wallet", exact: true }).selectOption("pot");
    await page.getByLabel("Silver", { exact: true }).fill("75000");
    await page.getByLabel("Reason", { exact: true }).fill("Guild tax");
    await page.getByRole("button", { name: "Credit 75,000 silver" }).click();
    await expect(page.getByRole("table")).toContainText("Guild tax");
    await expect(page.getByText("Team pot").first()).toBeVisible();
    expect(
      (await db.groupWalletEntry.findFirstOrThrow({ where: { groupId, userId: null } })).amount,
    ).toBe(75000);
    await page.getByRole("tab", { name: "Rolls & flips", exact: true }).click();
    await page.getByRole("button", { name: "Call it yourself" }).click();
    await page.getByRole("radio", { name: "Tails" }).click();
    await page.getByRole("button", { name: "Flip the coin" }).click();
    await expect(
      page.getByText(/^(Heads|Tails): You (called it|lost the call)$/).first(),
    ).toBeVisible();
    const last = await db.groupCoinFlip.findFirstOrThrow({
      where: { groupId, createdById: ids[0] },
      orderBy: { createdAt: "desc" },
    });
    await expect(
      page.getByText(new RegExp(`^${last.outcome === "heads" ? "Heads" : "Tails"}: You`)).first(),
    ).toBeVisible();

    // A saved loot split pays into wallets once, by someone with Manage wallet.
    const split = await db.groupLootSplit.create({
      data: {
        groupId,
        title: "ZvZ haul",
        createdById: ids[0],
        configuration: {
          pool: 900,
          notes: "",
          expenses: [],
          participants: [
            { userId: ids[0], shares: 2 },
            { userId: ids[2], shares: 1 },
          ],
        },
      },
    });
    expect((await post(2, "wallet", { action: "pay-split", splitId: split.id })).status()).toBe(
      403,
    );
    const paid = await (await post(1, "wallet", { action: "pay-split", splitId: split.id })).json();
    expect(paid.paid).toEqual([
      { userId: ids[0], silver: 600 },
      { userId: ids[2], silver: 300 },
    ]);
    expect((await post(1, "wallet", { action: "pay-split", splitId: split.id })).status()).toBe(
      409,
    );
    expect(await db.groupWalletEntry.count({ where: { groupId, kind: "split" } })).toBe(2);

    // Demoted officer loses Manage wallet with the Officer role.
    await db.groupRoleAssignment.deleteMany({ where: { groupId, userId: ids[1] } });
    expect((await post(1, "wallet", { ...credit, key: key() })).status()).toBe(403);
  } finally {
    for (const c of contexts.slice(1)) await c.close();
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
