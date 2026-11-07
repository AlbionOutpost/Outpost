import { db } from "../db";
import { HttpError } from "../api-errors";
import { can, fromMask, ownerRank, rankOf, resolveAccess } from "./permissions";
import { buildInput } from "../builds/validation";
import { memberSlot } from "../compositions/validation";
export async function groupDashboard(id: string, userId?: string) {
  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      region: true,
      visibility: true,
      crestItem: true,
      crestColor: true,
      activities: true,
      recruiting: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true } },
    },
  });
  if (!group) throw new HttpError(404, "Group not found");
  const held = {
    roles: { select: { roleId: true, role: { select: { position: true, permissions: true } } } },
  };
  const membership = userId
    ? await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId } },
        select: { userId: true, ...held },
      })
    : null;
  if (!membership) {
    if (group.visibility !== "PUBLIC") throw new HttpError(404, "Group not found");
    return { group, membership: null };
  }
  const access = resolveAccess(
    group.ownerId === membership.userId,
    membership.roles.map((r) => r.role),
  );
  const now = new Date();
  const eventInclude = { rsvps: { include: { user: { select: { name: true } } } } } as const;
  // Reserve capacity for upcoming activities; historical events cannot crowd them out.
  const eventWindow = Promise.all([
    db.groupEvent.findMany({
      where: { groupId: id, startsAt: { gte: now }, cancelled: false },
      include: eventInclude,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: 30,
    }),
    db.groupEvent.findMany({
      where: { groupId: id, OR: [{ startsAt: { lt: now } }, { cancelled: true }] },
      include: eventInclude,
      orderBy: [{ startsAt: "desc" }, { id: "asc" }],
      take: 20,
    }),
  ]).then(([future, recent]) =>
    [...future, ...recent].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
  );
  const [
    roles,
    members,
    invitations,
    requests,
    announcements,
    events,
    builds,
    compositions,
    availableBuilds,
    previews,
  ] = await Promise.all([
    db.groupCustomRole.findMany({
      where: { groupId: id },
      select: {
        id: true,
        name: true,
        color: true,
        position: true,
        permissions: true,
        isDefault: true,
        _count: { select: { assignments: true } },
      },
      orderBy: [{ position: "desc" }, { id: "asc" }],
      take: 100,
    }),
    db.groupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { name: true, avatarFrame: true } }, ...held },
      orderBy: { joinedAt: "asc" },
      take: 500,
    }),
    can(access, "inviteMembers") || can(access, "manageRequests")
      ? db.groupInvitation.findMany({
          where: {
            groupId: id,
            ...(!can(access, "manageRequests") ? { createdById: userId } : {}),
          },
          select: { id: true, expiresAt: true, revokedAt: true, acceptedAt: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [],
    can(access, "manageRequests")
      ? db.groupMembershipRequest.findMany({
          where: { groupId: id, status: "PENDING" },
          include: { user: { select: { name: true, avatarFrame: true } } },
          take: 100,
        })
      : [],
    db.groupAnnouncement.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    eventWindow,
    db.groupBuild.findMany({ where: { groupId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.composition.findMany({
      where: { groupId: id, visibility: "GROUP", hiddenAt: null },
      select: { id: true, title: true },
      take: 100,
    }),
    can(access, "manageBuilds")
      ? db.build.findMany({
          where: { hiddenAt: null, OR: [{ authorId: userId }, { visibility: "PUBLIC" }] },
          select: { id: true, title: true },
          take: 100,
        })
      : [],
    // Only four overview snapshots; do not fetch every composition's equipment for the directory.
    db.composition.findMany({
      where: { groupId: id, visibility: "GROUP", hiddenAt: null },
      select: { id: true, title: true, slots: true },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 4,
    }),
  ]);
  return {
    group,
    membership: {
      userId: membership.userId,
      access: { owner: access.owner, rank: access.rank, permissions: fromMask(access.permissions) },
    },
    dashboard: {
      memberCount: group._count.members,
      roles: roles.map(({ _count, permissions, ...role }) => ({
        ...role,
        permissions: fromMask(permissions),
        members: _count.assignments,
      })),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.name || "Adventurer",
        avatarFrame: m.user.avatarFrame,
        owner: m.userId === group.ownerId,
        rank: m.userId === group.ownerId ? ownerRank : rankOf(m.roles.map((r) => r.role)),
        roleIds: m.roles.map((r) => r.roleId),
      })),
      invitations: invitations.map((i) => ({
        ...i,
        expiresAt: i.expiresAt.toISOString(),
        revokedAt: i.revokedAt?.toISOString() || null,
        acceptedAt: i.acceptedAt?.toISOString() || null,
      })),
      requests: requests.map((r) => ({
        userId: r.userId,
        name: r.user.name || "Adventurer",
        avatarFrame: r.user.avatarFrame,
        message: r.message,
      })),
      announcements: announcements.map((a) => ({ id: a.id, title: a.title, body: a.body })),
      events: events.map((e) => ({
        version: e.version,
        id: e.id,
        title: e.title,
        description: e.description,
        startsAt: e.startsAt.toISOString(),
        timezone: e.timezone,
        voiceInfo: e.voiceInfo,
        expectedParticipants: e.expectedParticipants,
        compositionId: e.compositionId,
        cancelled: e.cancelled,
        rsvps: e.rsvps.map((r) => ({
          userId: r.userId,
          name: r.user.name || "Adventurer",
          status: r.status,
          role: r.role,
        })),
      })),
      builds: builds.map((b) => {
        const parsed = buildInput.safeParse(b.snapshot);
        return {
          id: b.id,
          title: b.title,
          equipment: parsed.success
            ? parsed.data.equipment.map((e) => ({
                slot: e.slot,
                itemId: e.itemId,
                quality: e.quality,
                abilities: e.abilities,
              }))
            : [],
        };
      }),
      compositions,
      compositionPreviews: previews.map((c) => {
        const parsed = memberSlot.array().max(100).safeParse(c.slots);
        return {
          id: c.id,
          title: c.title,
          playerCount: parsed.success ? parsed.data.length : null,
          weapons: parsed.success
            ? parsed.data.slice(0, 5).flatMap((m) => {
                const item = m.equipment.find((e) => e.slot === "Main hand");
                return item
                  ? [
                      {
                        itemId: item.itemId,
                        quality: item.quality,
                        role: m.role === "Custom" ? m.customRole : m.role,
                      },
                    ]
                  : [];
              })
            : [],
        };
      }),
      availableBuilds,
    },
  };
}
export type GroupDashboardData = NonNullable<
  Awaited<ReturnType<typeof groupDashboard>>["dashboard"]
>;
