import { db, databaseService } from "../db";
import { requireAdmin } from "./access";
import { adminQuery } from "./validation";
import { HttpError } from "../http-error";
const day = 86400000;
const activeGift = (now: Date) => ({
  OR: [
    { plan: "SUPPORTER" },
    { supporterGiftPermanent: true },
    { supporterGiftUntil: { gt: now } },
  ],
});
const banned = (now: Date) => ({
  bannedAt: { not: null },
  OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
});
async function localAdminOverview(actorId: string) {
  await requireAdmin(actorId);
  const now = new Date(),
    since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * day,
    );
  const [
    users,
    builds,
    comps,
    teams,
    supporters,
    openReports,
    bannedUsers,
    sessions,
    accounts,
    buildEvents,
    compEvents,
    audit,
  ] = await Promise.all([
    db.user.count(),
    db.build.count(),
    db.composition.count(),
    db.group.count(),
    db.user.count({ where: activeGift(now) }),
    db.contentReport.count({ where: { status: "OPEN" } }),
    db.user.count({ where: banned(now) }),
    db.session.count({ where: { expires: { gt: now } } }),
    db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5001,
    }),
    db.build.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5001,
    }),
    db.composition.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5001,
    }),
    db.adminAudit.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 6 }),
  ]);
  const trend = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(since.getTime() + i * day).toISOString().slice(0, 10),
    accounts: 0,
    builds: 0,
    comps: 0,
  }));
  for (const [key, events] of [
    ["accounts", accounts],
    ["builds", buildEvents],
    ["comps", compEvents],
  ] as const)
    for (const event of events.slice(0, 5000)) {
      const row = trend.find(
        (r) => r.date === new Date(event.createdAt).toISOString().slice(0, 10),
      );
      if (row) row[key]++;
    }
  return {
    asOf: now.toISOString(),
    counts: { users, builds, comps, teams, supporters, openReports, bannedUsers, sessions },
    trend,
    chartLimited: [accounts, buildEvents, compEvents].some((rows) => rows.length > 5000),
    audit,
  };
}
export const adminOverview: typeof localAdminOverview = (...args) =>
  databaseService("adminOverview", args) ?? localAdminOverview(...args);
const reviewWhere = {
  OR: [
    { builds: { some: { reports: { some: { status: "OPEN" } } } } },
    { compositions: { some: { reports: { some: { status: "OPEN" } } } } },
    { comments: { some: { reports: { some: { status: "OPEN" } } } } },
  ],
};
async function localAdminUsers(actorId: string, input: unknown) {
  await requireAdmin(actorId);
  const query = adminQuery.parse(input),
    now = new Date();
  const where = {
    AND: [
      ...(query.q
        ? [
            {
              OR: [
                { name: { contains: query.q, mode: "insensitive" as const } },
                { id: query.q },
                { accounts: { some: { provider: "discord", providerAccountId: query.q } } },
              ],
            },
          ]
        : []),
      ...(query.filter === "supporters"
        ? [activeGift(now)]
        : query.filter === "banned"
          ? [banned(now)]
          : query.filter === "review"
            ? [reviewWhere]
            : []),
    ],
  };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (query.page - 1) * 20,
      take: 20,
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        plan: true,
        supporterGiftUntil: true,
        supporterGiftPermanent: true,
        bannedAt: true,
        bannedUntil: true,
        accounts: { where: { provider: "discord" }, select: { providerAccountId: true }, take: 1 },
        _count: {
          select: {
            builds: true,
            comments: true,
            compositions: true,
            sessions: { where: { expires: { gt: now } } },
          },
        },
      },
    }),
  ]);
  return { query, total, rows };
}
export const adminUsers: typeof localAdminUsers = (...args) =>
  databaseService("adminUsers", args) ?? localAdminUsers(...args);
async function localAdminUserDetail(actorId: string, id: string) {
  await requireAdmin(actorId);
  const asOf = new Date().toISOString();
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      plan: true,
      planStatus: true,
      planRenewsAt: true,
      supporterGiftUntil: true,
      supporterGiftPermanent: true,
      bannedAt: true,
      bannedUntil: true,
      accounts: { where: { provider: "discord" }, select: { providerAccountId: true }, take: 1 },
      _count: {
        select: {
          builds: true,
          compositions: true,
          comments: true,
          sessions: { where: { expires: { gt: new Date() } } },
        },
      },
    },
  });
  if (!user) throw new HttpError(404, "Account not found");
  const discordId = user.accounts[0]?.providerAccountId;
  const [ban, openReports, audit] = await Promise.all([
    discordId ? db.discordBan.findUnique({ where: { discordId } }) : null,
    db.contentReport.count({
      where: {
        status: "OPEN",
        OR: [
          { build: { authorId: id } },
          { composition: { authorId: id } },
          { comment: { authorId: id } },
        ],
      },
    }),
    db.adminAudit.findMany({
      where: { targetId: { in: [id, ...(discordId ? [discordId] : [])] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
    }),
  ]);
  return { user, ban, openReports, audit, asOf };
}
export const adminUserDetail: typeof localAdminUserDetail = (...args) =>
  databaseService("adminUserDetail", args) ?? localAdminUserDetail(...args);
async function localAdminAuditLog(actorId: string, page: number) {
  await requireAdmin(actorId);
  if (!Number.isInteger(page) || page < 1 || page > 1000) throw new HttpError(400, "Invalid page");
  const [total, rows] = await Promise.all([
    db.adminAudit.count(),
    db.adminAudit.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 25,
      take: 25,
    }),
  ]);
  return { total, rows };
}
export const adminAuditLog: typeof localAdminAuditLog = (...args) =>
  databaseService("adminAuditLog", args) ?? localAdminAuditLog(...args);
export type AdminOverview = Awaited<ReturnType<typeof adminOverview>>;
export type AdminUserDetail = Awaited<ReturnType<typeof adminUserDetail>>;

async function localAdminReview(actorId: string) {
  await requireAdmin(actorId);
  const now = new Date(),
    since = new Date(now.getTime() - day);
  const [sessions, comments] = await Promise.all([
    db.session.groupBy({
      by: ["userId"],
      where: { expires: { gt: now } },
      _count: { id: true },
      having: { id: { _count: { gte: 8 } } },
      orderBy: { _count: { id: "desc" } },
      take: 101,
    }),
    db.contentComment.groupBy({
      by: ["authorId"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      having: { id: { _count: { gte: 20 } } },
      orderBy: { _count: { id: "desc" } },
      take: 101,
    }),
  ]);
  const rows = await db.user.findMany({
    where: {
      NOT: banned(now),
      OR: [
        ...reviewWhere.OR,
        { id: { in: sessions.slice(0, 100).map((s) => s.userId) } },
        { id: { in: comments.slice(0, 100).map((c) => c.authorId) }, createdAt: { gte: since } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 51,
    select: {
      id: true,
      name: true,
      role: true,
      createdAt: true,
      accounts: { where: { provider: "discord" }, select: { providerAccountId: true }, take: 1 },
      _count: {
        select: {
          sessions: { where: { expires: { gt: now } } },
          comments: { where: { createdAt: { gte: since } } },
        },
      },
    },
  });
  const users = await Promise.all(
    rows.slice(0, 50).map(async (user) => ({
      ...user,
      openReports: await db.contentReport.count({
        where: {
          status: "OPEN",
          OR: [
            { build: { authorId: user.id } },
            { composition: { authorId: user.id } },
            { comment: { authorId: user.id } },
          ],
        },
      }),
    })),
  );
  return {
    users,
    limited: rows.length > 50 || sessions.length > 100 || comments.length > 100,
    asOf: now.toISOString(),
  };
}
export const adminReview: typeof localAdminReview = (...args) =>
  databaseService("adminReview", args) ?? localAdminReview(...args);
