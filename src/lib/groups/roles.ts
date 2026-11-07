import type { Prisma } from "@prisma/client";
import { can, rankOf, resolveAccess, seededRoles, type TeamAccess } from "./permissions";

type Client = Prisma.TransactionClient;
const heldRoles = {
  roles: { select: { role: { select: { position: true, permissions: true } } } },
};

/** A member's current rights, read from the rows (null for anyone outside the team). */
export async function loadTeamAccess(
  client: Client,
  groupId: string,
  userId?: string | null,
): Promise<TeamAccess | null> {
  if (!userId) return null;
  const member = await client.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { group: { select: { ownerId: true } }, ...heldRoles },
  });
  if (!member) return null;
  return resolveAccess(
    member.group.ownerId === userId,
    member.roles.map((r) => r.role),
  );
}

/** The rank of another member: the position of their highest role. */
export async function memberRank(client: Client, groupId: string, userId: string) {
  const member = await client.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: heldRoles,
  });
  return member ? rankOf(member.roles.map((r) => r.role)) : null;
}

/** The role list a team starts with: Admin, Officer and the default Member. */
export const starterRoles = () =>
  seededRoles.map(({ name, color, position, permissions, isDefault }) => ({
    name,
    color,
    position,
    permissions,
    isDefault,
  }));

/**
 * Gives a team without roles the starter roles and maps each member's old fixed role onto
 * them (Admin, Officer, Member; the owner needs none). Mirrors the schema migration, for
 * fixtures and teams created before roles existed.
 */
export async function seedTeamRoles(client: Client, groupId: string) {
  const group = await client.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { ownerId: true },
  });
  const members = await client.groupMember.findMany({
    where: { groupId },
    select: { userId: true, role: true },
  });
  for (const seed of seededRoles) {
    const { legacy, ...data } = seed;
    const role = await client.groupCustomRole.create({
      data: { ...data, groupId },
      select: { id: true },
    });
    const holders = members.filter(
      (m) =>
        m.userId !== group.ownerId &&
        (m.role === legacy || (legacy === "ADMIN" && m.role === "OWNER")),
    );
    if (holders.length)
      await client.groupRoleAssignment.createMany({
        data: holders.map((m) => ({ groupId, userId: m.userId, roleId: role.id })),
      });
  }
}

/** A new member gets the team's default role, when it has one. */
export async function giveDefaultRole(client: Client, groupId: string, userId: string) {
  const role = await client.groupCustomRole.findFirst({
    where: { groupId, isDefault: true },
    select: { id: true },
  });
  if (role)
    await client.groupRoleAssignment.createMany({ data: [{ groupId, userId, roleId: role.id }] });
}

/** Revokes open invitation links whose issuer can no longer invite (removed or demoted). */
export async function revokeStaleInvites(client: Client, groupId: string) {
  const open = await client.groupInvitation.findMany({
    where: { groupId, acceptedAt: null, revokedAt: null },
    select: { createdById: true },
  });
  for (const issuer of new Set(open.map((i) => i.createdById))) {
    if (issuer && can(await loadTeamAccess(client, groupId, issuer), "inviteMembers")) continue;
    await client.groupInvitation.updateMany({
      where: { groupId, createdById: issuer, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
