import { Prisma } from "@/lib/prisma-runtime";
import { randomBytes, createHash } from "node:crypto";
import { db, databaseService } from "../db";
import { HttpError } from "../http-error";
import {
  can,
  canGrant,
  maxTeamRoles,
  outranksMember,
  outranksRole,
  resolveAccess,
  toMask,
  type TeamPermission,
} from "./permissions";
import { giveDefaultRole, loadTeamAccess, memberRank, revokeStaleInvites } from "./roles";
import { groupAction } from "./validation";
export function inviteHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
async function localMutateGroup(groupId: string, userId: string, input: unknown) {
  const action = groupAction.parse(input);
  return db
    .$transaction(
      async (tx) => {
        const group = await tx.group.findUnique({ where: { id: groupId } });
        if (!group) throw new HttpError(404, "Group not found");
        const actor = await tx.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
          select: {
            roles: { select: { role: { select: { position: true, permissions: true } } } },
          },
        });
        if (action.action === "request") {
          if (actor) throw new HttpError(409, "You are already a member");
          // Private teams are invisible to outsiders: answer exactly as if the team did not exist.
          if (group.visibility !== "PUBLIC") throw new HttpError(404, "Group not found");
          if (!group.recruiting) throw new HttpError(409, "This team is not taking requests");
          const previous = await tx.groupMembershipRequest.findUnique({
            where: { groupId_userId: { groupId, userId } },
            select: { status: true },
          });
          // A rejection stands; re-requesting must not put the player back in the queue.
          if (previous?.status === "REJECTED")
            throw new HttpError(409, "This team declined your membership request");
          await tx.groupMembershipRequest.upsert({
            where: { groupId_userId: { groupId, userId } },
            create: { groupId, userId, message: action.message },
            update: { status: "PENDING", message: action.message },
          });
          return { requested: true };
        }
        if (!actor) throw new HttpError(404, "Group not found");
        const owner = group.ownerId === userId;
        // Rights from the rows as they are now, inside this transaction; never from the client.
        const access = resolveAccess(
          owner,
          actor.roles.map((r) => r.role),
        );
        const need = (key: TeamPermission, message: string) => {
          if (!can(access, key)) throw new HttpError(403, message);
        };
        const teamRole = async (roleId: string) => {
          const role = await tx.groupCustomRole.findFirst({ where: { id: roleId, groupId } });
          if (!role) throw new HttpError(404, "Role not found");
          if (!outranksRole(access, role))
            throw new HttpError(403, "You can only change roles below your highest role");
          return role;
        };
        switch (action.action) {
          case "profile": {
            need("manageTeam", "Changing the team profile needs the Manage team permission");
            const { action: _, expectedUpdatedAt, ...fields } = action;
            void _;
            const changed = await tx.group.updateMany({
              where: { id: groupId, updatedAt: new Date(expectedUpdatedAt) },
              data: fields,
            });
            if (!changed.count)
              throw new HttpError(409, "Group profile changed. Reload before saving.");
            return { updated: true };
          }
          case "guild-tax": {
            need("manageTeam", "Changing the guild tax needs the Manage team permission");
            await tx.group.updateMany({
              where: { id: groupId },
              data: { guildTaxPercent: action.guildTaxPercent },
            });
            return { updated: true };
          }
          case "edit-event": {
            need("manageEvents", "Editing events needs the Manage events permission");
            if (new Date(action.startsAt).getTime() < Date.now() - 60000)
              throw new HttpError(400, "Choose a future event date");
            if (
              action.compositionId &&
              !(await tx.composition.findFirst({
                where: { id: action.compositionId, groupId, visibility: "GROUP", hiddenAt: null },
              }))
            )
              throw new HttpError(403, "Select a composition shared with this group");
            const { action: _, eventId, version, ...fields } = action;
            void _;
            const changed = await tx.groupEvent.updateMany({
              where: { id: eventId, groupId, version, cancelled: false },
              data: { ...fields, startsAt: new Date(fields.startsAt), version: { increment: 1 } },
            });
            if (!changed.count)
              throw new HttpError(
                409,
                "Event changed, was cancelled or is inaccessible. Reload before editing.",
              );
            return { updated: true };
          }
          case "invite": {
            need("inviteMembers", "Creating invitations needs the Invite members permission");
            const token = randomBytes(32).toString("hex");
            const invitation = await tx.groupInvitation.create({
              data: {
                groupId,
                createdById: userId,
                tokenHash: inviteHash(token),
                expiresAt: new Date(Date.now() + action.hours * 3600000),
              },
              select: { id: true, expiresAt: true },
            });
            return { ...invitation, path: `/invitations/${token}` };
          }
          case "revoke": {
            const invite = await tx.groupInvitation.findFirst({
              where: { id: action.invitationId, groupId },
            });
            if (
              !invite ||
              !(
                can(access, "manageRequests") ||
                (can(access, "inviteMembers") && invite.createdById === userId)
              )
            )
              throw new HttpError(403, "Invitation management denied");
            await tx.groupInvitation.update({
              where: { id: invite.id },
              data: { revokedAt: new Date() },
            });
            return { revoked: true };
          }
          case "decide": {
            need("manageRequests", "Reviewing requests needs the Review requests permission");
            const changed = await tx.groupMembershipRequest.updateMany({
              where: { groupId, userId: action.userId, status: "PENDING" },
              data: { status: action.approve ? "APPROVED" : "REJECTED" },
            });
            if (!changed.count) throw new HttpError(409, "Membership request already reviewed");
            if (
              action.approve &&
              !(await tx.groupMember.findUnique({
                where: { groupId_userId: { groupId, userId: action.userId } },
              }))
            ) {
              await tx.groupMember.create({ data: { groupId, userId: action.userId } });
              await giveDefaultRole(tx, groupId, action.userId);
            }
            return { reviewed: true };
          }
          case "role-create": {
            need("manageRoles", "Creating roles needs the Manage roles permission");
            const permissions = toMask(action.permissions);
            if (!canGrant(access, 0, permissions))
              throw new HttpError(403, "You can only grant permissions you have yourself");
            const roles = await tx.groupCustomRole.findMany({
              where: { groupId },
              select: { position: true },
            });
            if (roles.length >= maxTeamRoles)
              throw new HttpError(409, `A team can have up to ${maxTeamRoles} roles`);
            // A new role starts at the bottom, below every role its creator outranks.
            const position = roles.length ? Math.min(...roles.map((r) => r.position)) - 1 : 1;
            return tx.groupCustomRole.create({
              data: { groupId, name: action.name, color: action.color, permissions, position },
              select: { id: true },
            });
          }
          case "role-update": {
            need("manageRoles", "Editing roles needs the Manage roles permission");
            const role = await teamRole(action.roleId);
            const permissions = toMask(action.permissions);
            if (!canGrant(access, role.permissions, permissions))
              throw new HttpError(403, "You can only change permissions you have yourself");
            await tx.groupCustomRole.update({
              where: { id: role.id },
              data: { name: action.name, color: action.color, permissions },
            });
            await revokeStaleInvites(tx, groupId);
            return { updated: true };
          }
          case "role-delete": {
            need("manageRoles", "Deleting roles needs the Manage roles permission");
            const role = await teamRole(action.roleId);
            if (role.isDefault)
              throw new HttpError(409, "Pick another default role before deleting this one");
            if (!canGrant(access, role.permissions, 0))
              throw new HttpError(403, "You can only delete roles whose permissions you have");
            await tx.groupCustomRole.delete({ where: { id: role.id } });
            await revokeStaleInvites(tx, groupId);
            return { deleted: true };
          }
          case "role-move": {
            need("manageRoles", "Ordering roles needs the Manage roles permission");
            const role = await teamRole(action.roleId);
            const neighbour = await tx.groupCustomRole.findFirst({
              where:
                action.direction === "up"
                  ? { groupId, position: { gt: role.position } }
                  : { groupId, position: { lt: role.position } },
              orderBy: { position: action.direction === "up" ? "asc" : "desc" },
            });
            if (!neighbour) throw new HttpError(409, "That role is already at the end");
            if (!outranksRole(access, neighbour))
              throw new HttpError(403, "You can only move roles below your highest role");
            await tx.groupCustomRole.update({
              where: { id: role.id },
              data: { position: neighbour.position },
            });
            await tx.groupCustomRole.update({
              where: { id: neighbour.id },
              data: { position: role.position },
            });
            return { moved: true };
          }
          case "role-default": {
            need("manageRoles", "Choosing the default role needs the Manage roles permission");
            const role = await teamRole(action.roleId);
            // Every new member gets the default role: it may carry only rights the chooser holds.
            if (!canGrant(access, 0, role.permissions))
              throw new HttpError(403, "The default role can only carry permissions you have");
            await tx.groupCustomRole.updateMany({
              where: { groupId, isDefault: true },
              data: { isDefault: false },
            });
            await tx.groupCustomRole.update({ where: { id: role.id }, data: { isDefault: true } });
            return { updated: true };
          }
          case "member-roles": {
            need("manageRoles", "Assigning roles needs the Manage roles permission");
            if (action.userId === group.ownerId)
              throw new HttpError(403, "The owner already holds every permission");
            const rank = await memberRank(tx, groupId, action.userId);
            if (rank === null) throw new HttpError(404, "Member not found");
            if (action.userId !== userId && !outranksMember(access, rank))
              throw new HttpError(403, "You can only change roles of members below you");
            const wanted = new Set(action.roleIds);
            const roles = await tx.groupCustomRole.findMany({
              where: { groupId },
              select: { id: true, position: true, permissions: true },
            });
            if ([...wanted].some((id) => !roles.some((r) => r.id === id)))
              throw new HttpError(404, "Role not found");
            const held = new Set(
              (
                await tx.groupRoleAssignment.findMany({
                  where: { groupId, userId: action.userId },
                  select: { roleId: true },
                })
              ).map((a) => a.roleId),
            );
            const changed = roles.filter((r) => wanted.has(r.id) !== held.has(r.id));
            if (changed.some((r) => !outranksRole(access, r)))
              throw new HttpError(403, "You can only give or take roles below your highest role");
            // Handing out a role hands out its rights: only those the actor holds, so nobody can
            // raise themselves (or an alt) through a lower role that carries more.
            if (changed.some((r) => !canGrant(access, 0, r.permissions)))
              throw new HttpError(
                403,
                "You can only give or take roles whose permissions you have",
              );
            const removed = changed.filter((r) => held.has(r.id)).map((r) => r.id);
            const added = changed.filter((r) => !held.has(r.id)).map((r) => r.id);
            if (removed.length)
              await tx.groupRoleAssignment.deleteMany({
                where: { groupId, userId: action.userId, roleId: { in: removed } },
              });
            if (added.length)
              await tx.groupRoleAssignment.createMany({
                data: added.map((roleId) => ({ groupId, userId: action.userId, roleId })),
              });
            await revokeStaleInvites(tx, groupId);
            return { updated: true };
          }
          case "remove": {
            need("removeMembers", "Removing members needs the Remove members permission");
            if (action.userId === group.ownerId || action.userId === userId)
              throw new HttpError(403, "Cannot remove this member");
            const rank = await memberRank(tx, groupId, action.userId);
            if (rank === null) throw new HttpError(404, "Member not found");
            if (!outranksMember(access, rank))
              throw new HttpError(403, "You can only remove members below your highest role");
            await tx.groupMember.delete({
              where: { groupId_userId: { groupId, userId: action.userId } },
            });
            await tx.groupInvitation.updateMany({
              where: { groupId, createdById: action.userId, acceptedAt: null, revokedAt: null },
              data: { revokedAt: new Date() },
            });
            return { removed: true };
          }
          case "leave": {
            if (owner) throw new HttpError(409, "Transfer ownership before leaving");
            await tx.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
            await tx.groupInvitation.updateMany({
              where: { groupId, createdById: userId, acceptedAt: null, revokedAt: null },
              data: { revokedAt: new Date() },
            });
            return { left: true };
          }
          case "transfer": {
            if (!owner) throw new HttpError(403, "Only the owner transfers ownership");
            if (action.userId === userId) throw new HttpError(400, "Choose another member");
            if (
              !(await tx.groupMember.findUnique({
                where: { groupId_userId: { groupId, userId: action.userId } },
              }))
            )
              throw new HttpError(404, "New owner must already be a member");
            // The previous owner keeps a seat at the top: the team's highest role.
            const top = await tx.groupCustomRole.findFirst({
              where: { groupId },
              orderBy: { position: "desc" },
              select: { id: true },
            });
            if (
              top &&
              !(await tx.groupRoleAssignment.findUnique({
                where: { roleId_userId: { roleId: top.id, userId } },
              }))
            )
              await tx.groupRoleAssignment.create({ data: { groupId, userId, roleId: top.id } });
            await tx.group.update({ where: { id: groupId }, data: { ownerId: action.userId } });
            await revokeStaleInvites(tx, groupId);
            return { transferred: true };
          }
          case "delete": {
            if (!owner) throw new HttpError(403, "Only the owner deletes the group");
            await tx.group.delete({ where: { id: groupId } });
            return { deleted: true };
          }
          case "announcement": {
            need("manageEvents", "Posting announcements needs the Manage events permission");
            return tx.groupAnnouncement.create({
              data: { groupId, title: action.title, body: action.body, authorId: userId },
              select: { id: true },
            });
          }
          case "remove-announcement": {
            need("manageEvents", "Posting announcements needs the Manage events permission");
            await tx.groupAnnouncement.deleteMany({ where: { id: action.id, groupId } });
            return { deleted: true };
          }
          case "event": {
            need("manageEvents", "Scheduling events needs the Manage events permission");
            if (new Date(action.startsAt).getTime() < Date.now() - 60000)
              throw new HttpError(400, "Choose a future event date");
            if (
              action.compositionId &&
              !(await tx.composition.findFirst({
                where: { id: action.compositionId, groupId, visibility: "GROUP", hiddenAt: null },
              }))
            )
              throw new HttpError(403, "Select a composition shared with this group");
            const { action: _, ...data } = action;
            void _;
            return tx.groupEvent.create({
              data: { ...data, startsAt: new Date(data.startsAt), groupId, authorId: userId },
              select: { id: true },
            });
          }
          case "cancel-event": {
            need("manageEvents", "Cancelling events needs the Manage events permission");
            const changed = await tx.groupEvent.updateMany({
              where: { id: action.eventId, groupId, cancelled: false },
              data: { cancelled: true, version: { increment: 1 } },
            });
            if (!changed.count) throw new HttpError(404, "Active event not found");
            return { cancelled: true };
          }
          case "rsvp": {
            const event = await tx.groupEvent.findFirst({
              where: { id: action.eventId, groupId, cancelled: false },
            });
            if (!event) throw new HttpError(404, "Active event not found");
            await tx.eventRSVP.upsert({
              where: { eventId_userId: { eventId: event.id, userId } },
              create: { eventId: event.id, userId, status: action.status, role: action.role },
              update: { status: action.status, role: action.role },
            });
            return { responded: true };
          }
          case "share-build": {
            need("manageBuilds", "Sharing builds needs the Share builds permission");
            const build = await tx.build.findUnique({
              where: { id: action.buildId },
              include: { equipment: true },
            });
            if (
              !build ||
              ((build.visibility === "PRIVATE" || build.hiddenAt) && build.authorId !== userId)
            )
              throw new HttpError(404, "Build not found");
            return tx.groupBuild.create({
              data: {
                groupId,
                sourceBuildId: build.id,
                authorId: userId,
                title: build.title,
                snapshot: {
                  title: build.title,
                  description: build.description,
                  contentType: build.contentType,
                  region: build.region,
                  visibility: "PRIVATE",
                  playerCount: build.playerCount,
                  recommendedIP: build.recommendedIP,
                  strategy: build.strategy,
                  patchNotes: build.patchNotes,
                  equipment: build.equipment.map((e) => ({
                    slot: e.slot,
                    itemId: e.itemId,
                    quality: e.quality,
                    abilities: e.abilities,
                    alternatives: e.alternatives,
                    abilitySelections: e.abilitySelections,
                    alternativeItemIds: e.alternativeItemIds,
                  })),
                } as Prisma.InputJsonValue,
              },
              select: { id: true },
            });
          }
          case "remove-build": {
            need("manageBuilds", "Removing shared builds needs the Share builds permission");
            await tx.groupBuild.deleteMany({ where: { id: action.id, groupId } });
            return { deleted: true };
          }
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
        throw new HttpError(409, "Membership changed during this request. Refresh and retry.");
      throw error;
    });
}
async function localAcceptInvitation(token: string, userId: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404, "Invitation unavailable");
  return db
    .$transaction(
      async (tx) => {
        const invite = await tx.groupInvitation.findUnique({
          where: { tokenHash: inviteHash(token) },
          include: { group: { select: { slug: true } } },
        });
        if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date())
          throw new HttpError(410, "Invitation expired, revoked or already used");
        // Recheck the issuer's current right to invite as well as the bearer. This also closes
        // outstanding links minted before removal/demotion revocation, or before account deletion.
        if (
          !invite.createdById ||
          !can(await loadTeamAccess(tx, invite.groupId, invite.createdById), "inviteMembers")
        )
          throw new HttpError(410, "Invitation unavailable");
        if (
          await tx.groupMember.findUnique({
            where: { groupId_userId: { groupId: invite.groupId, userId } },
          })
        )
          return { slug: invite.group.slug };
        const changed = await tx.groupInvitation.updateMany({
          where: {
            id: invite.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        });
        if (!changed.count) throw new HttpError(409, "Invitation no longer available");
        await tx.groupMember.create({ data: { groupId: invite.groupId, userId } });
        await giveDefaultRole(tx, invite.groupId, userId);
        return { slug: invite.group.slug };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
        throw new HttpError(409, "Invitation changed. Retry or ask for a new link.");
      throw error;
    });
}

export const mutateGroup: typeof localMutateGroup = (...args) =>
  databaseService<Awaited<ReturnType<typeof localMutateGroup>>>("mutateGroup", args) ??
  localMutateGroup(...args);

export const acceptInvitation: typeof localAcceptInvitation = (...args) =>
  databaseService<Awaited<ReturnType<typeof localAcceptInvitation>>>("acceptInvitation", args) ??
  localAcceptInvitation(...args);
