import { z } from "zod";
import { db, databaseService } from "../db";
import { Prisma } from "../prisma-runtime";
import { HttpError } from "../http-error";
import { retrySerialization } from "../serialization-retry";
import { accountBanned } from "../admin/policy";
import { can, type TeamAccess } from "../groups/permissions";
import { loadTeamAccess } from "../groups/roles";
import { deadlineError, drawWinners, giveawayAction, type GiveawayAction } from "./rules";
import { displayName } from "../display-name";

type Tx = Prisma.TransactionClient;
const scopeId = z.string().min(1).max(100).nullable();

/**
 * Who is asking, read from current rows inside the transaction: site-wide giveaways are run by a
 * current, unbanned global ADMIN; a Team's by members holding Manage giveaways. Outsiders of a
 * Team learn nothing, not even that it exists.
 */
async function viewerOf(tx: Tx, groupId: string | null, userId: string | null) {
  if (groupId) {
    const access = userId ? await loadTeamAccess(tx, groupId, userId) : null;
    if (!access) throw new HttpError(404, "Team not found");
    return { userId, manage: can(access, "manageGiveaways"), access };
  }
  if (!userId) return { userId, manage: false, access: null as TeamAccess | null };
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true, bannedAt: true, bannedUntil: true },
  });
  if (!user || accountBanned(user)) throw new HttpError(401, "Sign in to take part");
  return { userId, manage: user.role === "ADMIN", access: null as TeamAccess | null };
}
type Viewer = Awaited<ReturnType<typeof viewerOf>>;

const giveawaySelect = {
  id: true,
  groupId: true,
  title: true,
  prize: true,
  image: true,
  region: true,
  rules: true,
  winnerCount: true,
  closesAt: true,
  status: true,
  version: true,
  createdAt: true,
  drawnAt: true,
  cancelledAt: true,
  drawnBy: { select: { name: true } },
} satisfies Prisma.GiveawaySelect;

/**
 * The board a player sees: open giveaways soonest first, then the twenty most recently drawn or
 * cancelled. Each carries its entry count, the viewer's own entry and, once drawn, the winners by
 * display name. A Team's counts and draws include only current members.
 */
async function board(tx: Tx, groupId: string | null, viewer: Viewer) {
  const [open, recent] = await Promise.all([
    tx.giveaway.findMany({
      where: { groupId, status: "OPEN" },
      select: giveawaySelect,
      orderBy: [{ closesAt: "asc" }, { id: "asc" }],
      take: 50,
    }),
    tx.giveaway.findMany({
      where: { groupId, status: { in: ["DRAWN", "CANCELLED"] } },
      select: giveawaySelect,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 20,
    }),
  ]);
  const rows = [...open, ...recent];
  const ids = rows.map((g) => g.id);
  const members = groupId
    ? (await tx.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
        (m) => m.userId,
      )
    : null;
  const [counts, mine, winners] = ids.length
    ? await Promise.all([
        tx.giveawayEntry.groupBy({
          by: ["giveawayId"],
          where: { giveawayId: { in: ids }, ...(members ? { userId: { in: members } } : {}) },
          _count: { _all: true },
        }),
        viewer.userId
          ? tx.giveawayEntry.findMany({
              where: { giveawayId: { in: ids }, userId: viewer.userId },
              select: { giveawayId: true, winnerPosition: true },
            })
          : Promise.resolve([]),
        tx.giveawayEntry.findMany({
          where: { giveawayId: { in: ids }, winnerPosition: { not: null } },
          select: {
            giveawayId: true,
            winnerPosition: true,
            user: { select: { name: true } },
          },
          orderBy: { winnerPosition: "asc" },
        }),
      ])
    : [[], [], []];
  const count = new Map(counts.map((c) => [c.giveawayId, c._count._all]));
  const own = new Map(mine.map((e) => [e.giveawayId, e.winnerPosition]));
  return {
    canManage: viewer.manage,
    signedIn: !!viewer.userId,
    giveaways: rows.map((g) => ({
      id: g.id,
      title: g.title,
      prize: g.prize,
      image: g.image,
      region: g.region,
      rules: g.rules,
      winnerCount: g.winnerCount,
      closesAt: g.closesAt.toISOString(),
      status: g.status,
      version: g.version,
      createdAt: g.createdAt.toISOString(),
      drawnAt: g.drawnAt?.toISOString() ?? null,
      // Site-wide draws are made by Outpost staff; a Team sees which member drew.
      drawnBy: g.drawnAt ? (groupId ? displayName(g.drawnBy?.name) : "Outpost staff") : null,
      cancelledAt: g.cancelledAt?.toISOString() ?? null,
      entries: count.get(g.id) ?? 0,
      entered: own.has(g.id),
      place: own.get(g.id) ?? null,
      winners: winners
        .filter((w) => w.giveawayId === g.id)
        .map((w) => ({ place: w.winnerPosition!, name: displayName(w.user.name) })),
    })),
  };
}
export type GiveawayBoard = Awaited<ReturnType<typeof board>>;
export type GiveawayCard = GiveawayBoard["giveaways"][number];

function transaction<T>(work: (tx: Tx) => Promise<T>) {
  return retrySerialization(() =>
    db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  ).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new HttpError(409, "The giveaway changed at the same time. Refresh and retry.");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new HttpError(409, "You have already entered this giveaway.");
    throw error;
  });
}

async function localGiveawayBoard(groupId: string | null, userId: string | null) {
  scopeId.parse(groupId);
  scopeId.parse(userId);
  return transaction(async (tx) => board(tx, groupId, await viewerOf(tx, groupId, userId)));
}
/** The giveaways a player can see: site-wide (`groupId` null) or a Team's, for its members. */
export const giveawayBoard: typeof localGiveawayBoard = (...args) =>
  databaseService<Awaited<ReturnType<typeof localGiveawayBoard>>>("giveawayBoard", args) ??
  localGiveawayBoard(...args);

function manageOnly(viewer: Viewer, groupId: string | null, label: string) {
  if (viewer.manage) return;
  throw new HttpError(
    403,
    groupId
      ? `${label} needs the Manage giveaways permission`
      : `${label} is for Outpost staff only`,
  );
}

async function localGiveawayAction(groupId: string | null, userId: string, input: unknown) {
  scopeId.parse(groupId);
  z.string().min(1).max(100).parse(userId);
  const action: GiveawayAction = giveawayAction.parse(input);
  return transaction(async (tx) => {
    const viewer = await viewerOf(tx, groupId, userId);
    const now = new Date();
    const done = async (extra: Record<string, unknown> = {}) => ({
      board: await board(tx, groupId, viewer),
      ...extra,
    });

    if (action.action === "create") {
      manageOnly(viewer, groupId, "Starting a giveaway");
      const late = deadlineError(action.closesAt, now.getTime());
      if (late) throw new HttpError(400, late);
      if ((await tx.giveaway.count({ where: { groupId, status: "OPEN" } })) >= 20)
        throw new HttpError(409, "Twenty giveaways are already open. Draw or cancel one first.");
      const created = await tx.giveaway.create({
        data: {
          groupId,
          title: action.title,
          prize: action.prize,
          image: action.image,
          region: action.region,
          rules: action.rules,
          winnerCount: action.winnerCount,
          closesAt: new Date(action.closesAt),
          createdById: userId,
        },
        select: { id: true },
      });
      return done({ id: created.id });
    }

    // Every other action names a giveaway of this scope; anything else is not found.
    const giveaway = await tx.giveaway.findFirst({
      where: { id: action.id, groupId },
      select: { id: true, status: true, closesAt: true, version: true, winnerCount: true },
    });
    if (!giveaway) throw new HttpError(404, "Giveaway not found");
    const closed = giveaway.closesAt.getTime() <= now.getTime();

    if (action.action === "enter" || action.action === "leave") {
      if (giveaway.status !== "OPEN" || closed)
        throw new HttpError(409, "Entries for this giveaway have closed.");
      if (action.action === "enter") {
        const already = await tx.giveawayEntry.findUnique({
          where: { giveawayId_userId: { giveawayId: giveaway.id, userId } },
          select: { userId: true },
        });
        if (already) throw new HttpError(409, "You have already entered this giveaway.");
        await tx.giveawayEntry.create({ data: { giveawayId: giveaway.id, userId } });
      } else {
        await tx.giveawayEntry.deleteMany({ where: { giveawayId: giveaway.id, userId } });
      }
      return done();
    }

    if (action.action === "draw") {
      manageOnly(viewer, groupId, "Drawing winners");
      // Drawn once: asking again returns the first result and changes nothing.
      if (giveaway.status === "DRAWN") return done({ alreadyDrawn: true });
      if (giveaway.status !== "OPEN") throw new HttpError(409, "This giveaway was cancelled.");
      if (!closed) throw new HttpError(409, "Winners can be drawn once entries close.");
      const entries = await tx.giveawayEntry.findMany({
        where: { giveawayId: giveaway.id },
        select: {
          userId: true,
          user: { select: { bannedAt: true, bannedUntil: true } },
        },
      });
      // Only players who still qualify can win: current members for a Team (anyone who left
      // before the draw is out), and accounts that are not banned for a site-wide giveaway.
      const members = groupId
        ? new Set(
            (
              await tx.groupMember.findMany({
                where: { groupId, userId: { in: entries.map((e) => e.userId) } },
                select: { userId: true },
              })
            ).map((m) => m.userId),
          )
        : null;
      const pool = entries
        .filter((e) => (members ? members.has(e.userId) : !accountBanned(e.user, now.getTime())))
        .map((e) => e.userId)
        .sort();
      const winners = drawWinners(pool, giveaway.winnerCount);
      // Winners are marked while the giveaway is still open, then it closes in the same
      // transaction; from then on the database refuses any change to it or its entries.
      for (const [index, winnerId] of winners.entries())
        await tx.giveawayEntry.updateMany({
          where: { giveawayId: giveaway.id, userId: winnerId, winnerPosition: null },
          data: { winnerPosition: index + 1 },
        });
      const drawn = await tx.giveaway.updateMany({
        where: { id: giveaway.id, status: "OPEN", version: giveaway.version },
        data: { status: "DRAWN", drawnAt: now, drawnById: userId, version: { increment: 1 } },
      });
      if (!drawn.count) throw new HttpError(409, "The giveaway changed. Refresh and retry.");
      return done({ drawn: winners.length });
    }

    if (giveaway.status !== "OPEN")
      throw new HttpError(409, "A drawn or cancelled giveaway cannot change.");

    if (action.action === "cancel") {
      manageOnly(viewer, groupId, "Cancelling a giveaway");
      await tx.giveaway.updateMany({
        where: { id: giveaway.id, status: "OPEN" },
        data: { status: "CANCELLED", cancelledAt: now, version: { increment: 1 } },
      });
      return done();
    }

    const edit = action as Extract<GiveawayAction, { action: "update" }>;
    manageOnly(viewer, groupId, "Editing a giveaway");
    // An unchanged deadline that has passed can stay, so a closed giveaway can still be fixed.
    const keep = new Date(edit.closesAt).getTime() === giveaway.closesAt.getTime();
    const late = keep ? null : deadlineError(edit.closesAt, now.getTime());
    if (late) throw new HttpError(400, late);
    const updated = await tx.giveaway.updateMany({
      where: { id: giveaway.id, status: "OPEN", version: edit.version },
      data: {
        title: edit.title,
        prize: edit.prize,
        image: edit.image,
        region: edit.region,
        rules: edit.rules,
        winnerCount: edit.winnerCount,
        closesAt: keep ? giveaway.closesAt : new Date(edit.closesAt),
        version: { increment: 1 },
      },
    });
    if (!updated.count)
      throw new HttpError(409, "Someone else changed this giveaway. Refresh before saving.");
    return done();
  });
}
/** Create, edit, cancel, draw, enter or leave; every right is re-read from current rows. */
export const changeGiveaway: typeof localGiveawayAction = (...args) =>
  databaseService<Awaited<ReturnType<typeof localGiveawayAction>>>("changeGiveaway", args) ??
  localGiveawayAction(...args);
