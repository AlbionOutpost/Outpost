import { db, databaseService } from "../db";
import { Prisma } from "../prisma-runtime";
import { HttpError } from "../http-error";
import { can, type TeamAccess } from "./permissions";
import { loadTeamAccess } from "./roles";
import { allocateLoot, lootConfiguration } from "./loot";
import {
  balancesFrom,
  flipSide,
  flipWinner,
  gameAction,
  maxSilver,
  rollShares,
  rollValue,
  rollWinner,
  uniformInt,
  walletAction,
} from "./economy";
import { z } from "zod";

type Tx = Prisma.TransactionClient;
const formerMember = "Former team member";

/* ----------------------------------------------------------------------------------------- */
/* Shared                                                                                     */
/* ----------------------------------------------------------------------------------------- */

async function teamAccess(tx: Tx, groupId: string, userId: string) {
  const access = await loadTeamAccess(tx, groupId, userId);
  // Outsiders learn nothing, not even that the team exists.
  if (!access) throw new HttpError(404, "Team not found");
  return access;
}
function need(access: TeamAccess, key: "manageWallet" | "manageLoot", label: string) {
  if (!can(access, key))
    throw new HttpError(403, `${label} needs the ${permissionName[key]} permission`);
}
const permissionName = { manageWallet: "Manage wallet", manageLoot: "Manage loot splits" };
async function balanceOf(tx: Tx, groupId: string, userId: string | null) {
  const sum = await tx.groupWalletEntry.aggregate({
    where: { groupId, userId },
    _sum: { amount: true },
  });
  return sum._sum.amount ?? 0;
}
async function currentMembers(tx: Tx, groupId: string, ids: string[]) {
  return (
    (await tx.groupMember.count({ where: { groupId, userId: { in: [...new Set(ids)] } } })) ===
    new Set(ids).size
  );
}
function transaction<T>(work: (tx: Tx) => Promise<T>) {
  return db
    .$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
        throw new HttpError(409, "The team wallet changed at the same time. Refresh and retry.");
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new HttpError(409, "That was already recorded. Refresh to see it.");
      throw error;
    });
}
const silver = (n: number) => `${n.toLocaleString("en")} silver`;

/* ----------------------------------------------------------------------------------------- */
/* Wallet                                                                                     */
/* ----------------------------------------------------------------------------------------- */

const entrySelect = {
  id: true,
  userId: true,
  amount: true,
  kind: true,
  reason: true,
  sourceId: true,
  createdAt: true,
  user: { select: { name: true } },
  createdBy: { select: { name: true } },
} satisfies Prisma.GroupWalletEntrySelect;

/**
 * What a member sees: the team pot, their own balance and history. Members with Manage wallet
 * also see every balance (former members' too while they hold silver) and the team's ledger.
 */
async function walletView(tx: Tx, groupId: string, userId: string, access: TeamAccess) {
  const manage = can(access, "manageWallet");
  const [sums, members, entries, paid] = await Promise.all([
    tx.groupWalletEntry.groupBy({
      by: ["userId"],
      where: manage ? { groupId } : { groupId, OR: [{ userId }, { userId: null }] },
      _sum: { amount: true },
    }),
    manage
      ? tx.groupMember.findMany({
          where: { groupId },
          select: { userId: true, user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    tx.groupWalletEntry.findMany({
      where: manage ? { groupId } : { groupId, userId },
      select: entrySelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: manage ? 100 : 50,
    }),
    tx.groupWalletEntry.groupBy({
      by: ["sourceId"],
      where: { groupId, kind: "split" },
    }),
  ]);
  const balances = balancesFrom(
    sums.map((s) => ({ userId: s.userId, amount: s._sum.amount ?? 0 })),
  );
  let rows: { userId: string; name: string; balance: number; member: boolean }[] | null = null;
  if (manage) {
    const known = new Map(members.map((m) => [m.userId, m.user.name || "Adventurer"]));
    const former = [...balances.entries()].filter(
      ([id, amount]) => id !== null && !known.has(id) && amount !== 0,
    );
    const formerNames = former.length
      ? await tx.user.findMany({
          where: { id: { in: former.map(([id]) => id!) } },
          select: { id: true, name: true },
        })
      : [];
    rows = [
      ...members.map((m) => ({
        userId: m.userId,
        name: known.get(m.userId)!,
        balance: balances.get(m.userId) ?? 0,
        member: true,
      })),
      ...former.map(([id, balance]) => ({
        userId: id!,
        name: formerNames.find((u) => u.id === id)?.name || formerMember,
        balance,
        member: false,
      })),
    ].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
  }
  return {
    canManage: manage,
    pot: balances.get(null) ?? 0,
    balance: balances.get(userId) ?? 0,
    members: rows,
    entries: entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.userId ? e.user?.name || formerMember : "Team pot",
      amount: e.amount,
      kind: e.kind,
      reason: e.reason,
      by: e.createdBy?.name || null,
      createdAt: e.createdAt.toISOString(),
    })),
    paidSplits: paid.map((p) => p.sourceId.replace(/^split:/, "")),
  };
}
export type TeamWalletView = Awaited<ReturnType<typeof walletView>>;

async function localTeamWallet(groupId: string, userId: string, input?: unknown) {
  z.string().min(1).max(100).parse(groupId);
  z.string().min(1).max(100).parse(userId);
  const action = input === undefined ? null : walletAction.parse(input);
  return transaction(async (tx) => {
    const access = await teamAccess(tx, groupId, userId);
    if (!action) return { wallet: await walletView(tx, groupId, userId, access) };
    need(access, "manageWallet", "Changing wallets");

    if (action.action === "pay-split") {
      const split = await tx.groupLootSplit.findFirst({
        where: { id: action.splitId, groupId },
        select: { id: true, title: true, configuration: true },
      });
      if (!split) throw new HttpError(404, "Loot split not found");
      const sourceId = `split:${split.id}`;
      if (await tx.groupWalletEntry.count({ where: { groupId, sourceId } }))
        throw new HttpError(409, "This split is already paid into wallets.");
      const config = lootConfiguration.safeParse(split.configuration);
      if (!config.success) throw new HttpError(409, "This saved split could not be read.");
      const result = allocateLoot(config.data);
      if (
        !(await currentMembers(
          tx,
          groupId,
          result.payouts.map((p) => p.userId),
        ))
      )
        throw new HttpError(409, "A participant has left the team. Edit the split before paying.");
      const payouts = result.payouts.filter((p) => p.silver > 0);
      if (!payouts.length && !result.guildTax)
        throw new HttpError(409, "This split pays out no silver.");
      // The guild tax the split took goes into the team pot, in the same booking.
      if (result.guildTax && (await balanceOf(tx, groupId, null)) + result.guildTax > maxSilver)
        throw new HttpError(409, "That would pass the largest balance Outpost records.");
      await tx.groupWalletEntry.createMany({
        data: [
          ...payouts.map((p) => ({ userId: p.userId as string | null, amount: p.silver })),
          ...(result.guildTax ? [{ userId: null, amount: result.guildTax }] : []),
        ].map((row) => ({
          groupId,
          ...row,
          kind: "split",
          reason: (result.guildTax && !row.userId
            ? `Guild tax · ${split.title}`
            : split.title
          ).slice(0, 200),
          sourceId,
          createdById: userId,
        })),
      });
      return {
        wallet: await walletView(tx, groupId, userId, access),
        paid: payouts.map((p) => ({ userId: p.userId, silver: p.silver })),
        guildTax: result.guildTax,
      };
    }

    const sourceId = `op:${action.key}`;
    // A retried request finds its own entry and changes nothing.
    if (await tx.groupWalletEntry.count({ where: { groupId, sourceId } }))
      return { wallet: await walletView(tx, groupId, userId, access) };
    const holder = action.target === "pot" ? null : action.target;
    const balance = await balanceOf(tx, groupId, holder);
    if (holder && !(await currentMembers(tx, groupId, [holder]))) {
      // A former member's silver can still be paid out or cleared, never added to.
      if (action.action === "credit" || balance === 0) throw new HttpError(404, "Member not found");
    }
    let amount: number;
    let reason: string;
    if (action.action === "credit") {
      if (balance + action.amount > maxSilver)
        throw new HttpError(409, "That would pass the largest balance Outpost records.");
      amount = action.amount;
      reason = action.reason;
    } else if (action.action === "reset") {
      if (balance === 0) throw new HttpError(409, "This balance is already zero.");
      amount = -balance;
      reason = action.reason || "Balance reset";
    } else {
      const take = action.action === "payout" ? (action.amount ?? balance) : action.amount;
      if (take <= 0) throw new HttpError(409, "There is no silver to pay out.");
      if (take > balance)
        throw new HttpError(
          409,
          `Only ${silver(balance)} in this wallet. Balances cannot go below zero.`,
        );
      amount = -take;
      reason = action.action === "debit" ? action.reason : action.reason || "Paid out in game";
    }
    await tx.groupWalletEntry.create({
      data: {
        groupId,
        userId: holder,
        amount,
        kind: action.action,
        reason,
        sourceId,
        createdById: userId,
      },
    });
    return { wallet: await walletView(tx, groupId, userId, access) };
  });
}
export const teamWallet: typeof localTeamWallet = (...args) =>
  databaseService<Awaited<ReturnType<typeof localTeamWallet>>>("teamWallet", args) ??
  localTeamWallet(...args);

/* ----------------------------------------------------------------------------------------- */
/* Coin flips and loot rolls                                                                  */
/* ----------------------------------------------------------------------------------------- */

const flipSelect = {
  id: true,
  createdById: true,
  headsId: true,
  tailsId: true,
  call: true,
  outcome: true,
  rollId: true,
  createdAt: true,
} satisfies Prisma.GroupCoinFlipSelect;
type FlipRow = Prisma.GroupCoinFlipGetPayload<{ select: typeof flipSelect }>;
const flipOut = (f: FlipRow) => ({
  ...f,
  winnerId: flipWinner(f),
  createdAt: f.createdAt.toISOString(),
});
const rollSelect = {
  id: true,
  title: true,
  silver: true,
  potShare: true,
  status: true,
  winnerId: true,
  tieBreak: true,
  createdById: true,
  createdAt: true,
  closedAt: true,
  entries: {
    select: { userId: true, value: true, createdAt: true },
    orderBy: [{ value: "desc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.GroupLootRollSelect;
type RollRow = Prisma.GroupLootRollGetPayload<{ select: typeof rollSelect }>;
const rollOut = (r: RollRow) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  closedAt: r.closedAt?.toISOString() ?? null,
  entries: r.entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
});

async function gamesView(tx: Tx, groupId: string, userId: string, access: TeamAccess) {
  const [flips, rolls, balance] = await Promise.all([
    tx.groupCoinFlip.findMany({
      where: { groupId },
      select: flipSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 30,
    }),
    tx.groupLootRoll.findMany({
      where: { groupId },
      select: rollSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
    }),
    balanceOf(tx, groupId, userId),
  ]);
  // Names for everyone shown, former members included (current members come with the page).
  const ids = new Set<string>();
  for (const f of flips) [f.headsId, f.tailsId, f.createdById].forEach((id) => id && ids.add(id));
  for (const r of rolls) {
    if (r.createdById) ids.add(r.createdById);
    r.entries.forEach((e) => ids.add(e.userId));
  }
  const users = ids.size
    ? await tx.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true } })
    : [];
  return {
    canRun: can(access, "manageLoot"),
    canPay: can(access, "manageWallet"),
    balance,
    names: Object.fromEntries(users.map((u) => [u.id, u.name || "Adventurer"])),
    flips: flips.map(flipOut),
    rolls: rolls.map(rollOut),
  };
}
export type TeamGamesView = Awaited<ReturnType<typeof gamesView>>;

async function localTeamGames(groupId: string, userId: string, input?: unknown) {
  z.string().min(1).max(100).parse(groupId);
  z.string().min(1).max(100).parse(userId);
  const action = input === undefined ? null : gameAction.parse(input);
  return transaction(async (tx) => {
    const access = await teamAccess(tx, groupId, userId);
    const view = async (extra: Record<string, unknown> = {}) => ({
      games: await gamesView(tx, groupId, userId, access),
      ...extra,
    });
    if (!action) return view();
    const now = new Date();

    if (action.action === "flip" || action.action === "call") {
      const replay = await tx.groupCoinFlip.findUnique({
        where: { groupId_key: { groupId, key: action.key } },
        select: flipSelect,
      });
      // The same request again returns the first result; the coin is never thrown twice.
      if (replay) {
        if (replay.createdById !== userId) throw new HttpError(409, "That flip key is taken.");
        return view({ flip: flipOut(replay) });
      }
      // A flip settles a tie or a decision: drawn now, no stake, no silver moves.
      if (
        action.action === "flip" &&
        !(await currentMembers(tx, groupId, [action.headsId, action.tailsId]))
      )
        throw new HttpError(404, "Both players must be current team members.");
      const flip = await tx.groupCoinFlip.create({
        data: {
          groupId,
          key: action.key,
          createdById: userId,
          ...(action.action === "call"
            ? { headsId: userId, call: action.call }
            : { headsId: action.headsId, tailsId: action.tailsId }),
          outcome: flipSide(),
        },
        select: flipSelect,
      });
      return view({ flip: flipOut(flip) });
    }

    if (action.action === "roll-open") {
      const replay = await tx.groupLootRoll.findUnique({
        where: { groupId_key: { groupId, key: action.key } },
        select: rollSelect,
      });
      if (replay) return view({ roll: rollOut(replay) });
      need(access, "manageLoot", "Opening a loot roll");
      if (action.silver > 0) need(access, "manageWallet", "Sharing silver into wallets");
      if ((await tx.groupLootRoll.count({ where: { groupId, status: "OPEN" } })) >= 10)
        throw new HttpError(409, "Ten rolls are already open. Close one first.");
      const roll = await tx.groupLootRoll.create({
        data: {
          groupId,
          key: action.key,
          title: action.title,
          silver: action.silver,
          potShare: action.potShare,
          createdById: userId,
        },
        select: rollSelect,
      });
      return view({ roll: rollOut(roll) });
    }

    const { rollId } = action as { rollId: string };
    const roll = await tx.groupLootRoll.findFirst({
      where: { id: rollId, groupId },
      select: rollSelect,
    });
    if (!roll) throw new HttpError(404, "Loot roll not found");

    if (action.action === "roll") {
      if (roll.status !== "OPEN") throw new HttpError(409, "This roll is closed.");
      const mine = roll.entries.find((e) => e.userId === userId);
      // One roll each: retrying never rolls again.
      if (mine) throw new HttpError(409, `You already rolled ${mine.value}.`);
      const value = rollValue();
      await tx.groupLootRollEntry.create({ data: { rollId, userId, value } });
      const row = await tx.groupLootRoll.findFirstOrThrow({
        where: { id: rollId },
        select: rollSelect,
      });
      return view({ roll: rollOut(row), value });
    }

    need(access, "manageLoot", "Closing a loot roll");
    if (roll.status !== "OPEN") return view({ roll: rollOut(roll) });
    if (action.action === "roll-cancel") {
      await tx.groupLootRoll.updateMany({
        where: { id: rollId, status: "OPEN" },
        data: { status: "CANCELLED", closedAt: now },
      });
    } else {
      if (roll.silver > 0) need(access, "manageWallet", "Sharing silver into wallets");
      // Only members still in the team when the roll closes can win or share.
      const members = new Set(
        (
          await tx.groupMember.findMany({
            where: { groupId, userId: { in: roll.entries.map((e) => e.userId) } },
            select: { userId: true },
          })
        ).map((m) => m.userId),
      );
      const entries = roll.entries.filter((e) => members.has(e.userId));
      // Two tied members settle it with a coin flip the team can see; more draw lots.
      const tie: { side: "heads" | "tails" | null } = { side: null };
      const { winnerId, tied } = rollWinner(entries, (count) => {
        if (count === 2) {
          tie.side = flipSide();
          return tie.side === "heads" ? 0 : 1;
        }
        return uniformInt(0, count - 1);
      });
      const closed = await tx.groupLootRoll.updateMany({
        where: { id: rollId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: now, winnerId, tieBreak: tied.length > 1 },
      });
      if (!closed.count) throw new HttpError(409, "This roll was already closed.");
      if (tie.side)
        await tx.groupCoinFlip.create({
          data: {
            groupId,
            key: `roll-${rollId}`,
            createdById: userId,
            headsId: tied[0],
            tailsId: tied[1],
            outcome: tie.side,
            rollId,
          },
        });
      const shares = rollShares(
        roll.silver,
        entries.map((e) => e.userId),
        roll.potShare,
      );
      if (shares.length)
        await tx.groupWalletEntry.createMany({
          data: shares.map((s) => ({
            groupId,
            userId: s.userId,
            amount: s.silver,
            kind: "roll",
            reason: roll.title,
            sourceId: `roll:${rollId}`,
            createdById: userId,
          })),
        });
    }
    const row = await tx.groupLootRoll.findFirstOrThrow({
      where: { id: rollId },
      select: rollSelect,
    });
    return view({ roll: rollOut(row) });
  });
}
export const teamGames: typeof localTeamGames = (...args) =>
  databaseService<Awaited<ReturnType<typeof localTeamGames>>>("teamGames", args) ??
  localTeamGames(...args);
