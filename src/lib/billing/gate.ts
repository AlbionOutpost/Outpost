import { db } from "@/lib/db";
import { HttpError } from "@/lib/http-error";
import { isSupporter, launchOpen, storedSupporter } from "./plan";
const entitlementSelect = {
  plan: true,
  supporterGiftUntil: true,
  supporterGiftPermanent: true,
  createdAt: true,
} as const;

/**
 * Running a Team is a Supporter feature: creating a workspace and managing one (profile,
 * events, announcements, invites, roles, shared builds, loot splits, the wallet, flips and
 * rolls, giveaways) need the owner to be a Supporter. Viewing, requesting to join, RSVPs,
 * entering a giveaway and leaving stay open to every member. Removing members, transferring
 * ownership and deleting the team are never locked: a lapsed owner must always be able to wind
 * a team down (account deletion requires it). During launch every account is a lifetime
 * Supporter (`launchGrant` in plan.ts), so the gates are on but nobody is locked out.
 */
export const teamManagementActions = new Set([
  "profile",
  "edit-event",
  "invite",
  "revoke",
  "decide",
  "role-create",
  "role-update",
  "role-delete",
  "role-move",
  "role-default",
  "member-roles",
  "announcement",
  "remove-announcement",
  "event",
  "cancel-event",
  "share-build",
  "remove-build",
]);

/** Giveaway actions that manage one (entering and leaving stay open). */
export const giveawayManagementActions = new Set(["create", "update", "cancel", "draw"]);

export const supporterMessage = {
  create: "Creating a team workspace is a Supporter feature.",
  manage: "Team management needs the team's owner to be a Supporter.",
};

export async function userIsSupporter(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: entitlementSelect });
  return isSupporter(user);
}

/** True when this user's ads are hidden: a stored plan or an admin gift. The launch grant does
 * not hide ads (owner, 9 Nov 2026: everyone sees ads except Supporters). */
export async function userIsAdFree(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: entitlementSelect });
  return storedSupporter(user);
}

/** True when this user may create a workspace right now. */
export async function canCreateTeam(userId: string) {
  // While the launch is on it covers every account, so the answer needs no read.
  return launchOpen() || userIsSupporter(userId);
}

/** True when the team's owner is a Supporter, which keeps its management open. */
export async function teamManagementOpen(groupId: string) {
  // Every team has an owner account, and an open launch covers every account.
  if (launchOpen()) return true;
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { owner: { select: entitlementSelect } },
  });
  // A missing team is the service's 404, not a Supporter question.
  return !group || isSupporter(group.owner);
}

export async function requireTeamCreation(userId: string) {
  if (!(await canCreateTeam(userId))) throw new HttpError(402, supporterMessage.create);
}
/**
 * Throws 402 when a gated action targets a lapsed team. Outsiders and missing teams pass
 * through so the service answers them with its own 404, and the plan of a private team's
 * owner is never revealed to non-members.
 */
export async function requireTeamManagement(groupId: string, action?: string, userId?: string) {
  if (action !== undefined && !teamManagementActions.has(action)) return;
  // An open launch makes every owner a Supporter: nothing to read.
  if (launchOpen()) return;
  if (
    userId &&
    !(await db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { userId: true },
    }))
  )
    return;
  if (!(await teamManagementOpen(groupId))) throw new HttpError(402, supporterMessage.manage);
}
