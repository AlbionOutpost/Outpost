import { Prisma } from "@/lib/prisma-runtime";
import { randomBytes, createHash } from "node:crypto";
import { db, databaseService } from "../db";
import { HttpError } from "../http-error";
import { canEditShared, canManageMembers } from "./permissions";
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
        });
        if (action.action === "request") {
          if (actor) throw new HttpError(409, "You are already a member");
          await tx.groupMembershipRequest.upsert({
            where: { groupId_userId: { groupId, userId } },
            create: { groupId, userId, message: action.message },
            update: { status: "PENDING", message: action.message },
          });
          return { requested: true };
        }
        if (!actor) throw new HttpError(404, "Group not found");
        const manager = canManageMembers(actor.role);
        const editor = canEditShared(actor.role);
        const owner = group.ownerId === userId;
        switch (action.action) {
          case "profile": {
            if (!manager)
              throw new HttpError(403, "Group profile changes require owner or admin permission");
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
          case "edit-event": {
            if (!editor) throw new HttpError(403, "Event editing requires officer permission");
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
            if (!editor) throw new HttpError(403, "Officers and administrators manage invitations");
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
            if (!editor) throw new HttpError(403, "Invitation management denied");
            const invite = await tx.groupInvitation.findFirst({
              where: { id: action.invitationId, groupId },
            });
            if (!invite || (!manager && invite.createdById !== userId))
              throw new HttpError(403, "Invitation management denied");
            await tx.groupInvitation.update({
              where: { id: invite.id },
              data: { revokedAt: new Date() },
            });
            return { revoked: true };
          }
          case "decide": {
            if (!manager) throw new HttpError(403, "Only owners and admins review membership");
            const changed = await tx.groupMembershipRequest.updateMany({
              where: { groupId, userId: action.userId, status: "PENDING" },
              data: { status: action.approve ? "APPROVED" : "REJECTED" },
            });
            if (!changed.count) throw new HttpError(409, "Membership request already reviewed");
            if (action.approve)
              await tx.groupMember.upsert({
                where: { groupId_userId: { groupId, userId: action.userId } },
                create: { groupId, userId: action.userId, role: "MEMBER" },
                update: {},
              });
            return { reviewed: true };
          }
          case "role": {
            if (!owner || action.userId === group.ownerId)
              throw new HttpError(403, "Only the owner can change non-owner roles");
            const target = await tx.groupMember.findUnique({
              where: { groupId_userId: { groupId, userId: action.userId } },
            });
            if (!target) throw new HttpError(404, "Member not found");
            await tx.groupMember.update({
              where: { groupId_userId: { groupId, userId: action.userId } },
              data: { role: action.role },
            });
            return { updated: true };
          }
          case "remove": {
            if (!manager || action.userId === group.ownerId)
              throw new HttpError(403, "Cannot remove this member");
            const target = await tx.groupMember.findUnique({
              where: { groupId_userId: { groupId, userId: action.userId } },
            });
            if (!target || (!owner && target.role === "ADMIN"))
              throw new HttpError(403, "Cannot remove this member");
            await tx.groupMember.delete({
              where: { groupId_userId: { groupId, userId: action.userId } },
            });
            return { removed: true };
          }
          case "leave": {
            if (owner) throw new HttpError(409, "Transfer ownership before leaving");
            await tx.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
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
            await tx.groupMember.update({
              where: { groupId_userId: { groupId, userId } },
              data: { role: "ADMIN" },
            });
            await tx.groupMember.update({
              where: { groupId_userId: { groupId, userId: action.userId } },
              data: { role: "OWNER" },
            });
            await tx.group.update({ where: { id: groupId }, data: { ownerId: action.userId } });
            return { transferred: true };
          }
          case "delete": {
            if (!owner) throw new HttpError(403, "Only the owner deletes the group");
            await tx.group.delete({ where: { id: groupId } });
            return { deleted: true };
          }
          case "announcement": {
            if (!editor) throw new HttpError(403, "Publishing requires officer permission");
            return tx.groupAnnouncement.create({
              data: { groupId, title: action.title, body: action.body, authorId: userId },
              select: { id: true },
            });
          }
          case "remove-announcement": {
            if (!editor) throw new HttpError(403, "Publishing requires officer permission");
            await tx.groupAnnouncement.deleteMany({ where: { id: action.id, groupId } });
            return { deleted: true };
          }
          case "event": {
            if (!editor) throw new HttpError(403, "Event scheduling requires officer permission");
            if (new Date(action.startsAt).getTime() < Date.now() - 60000)
              throw new HttpError(400, "Choose a future event date");
            if (
              action.compositionId &&
              !(await tx.composition.findFirst({
                where: { id: action.compositionId, groupId, visibility: "GROUP" },
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
            if (!editor) throw new HttpError(403, "Event management denied");
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
            if (!editor) throw new HttpError(403, "Sharing requires officer permission");
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
            if (!editor) throw new HttpError(403, "Sharing management denied");
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
        await tx.groupMember.create({ data: { groupId: invite.groupId, userId, role: "MEMBER" } });
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
