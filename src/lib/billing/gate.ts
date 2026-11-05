import { db } from "@/lib/db";
import { HttpError } from "@/lib/http-error";
import { billingEnabled } from "./stripe";
import { isSupporter } from "./plan";
const entitlementSelect = {
  plan: true,
  supporterGiftUntil: true,
  supporterGiftPermanent: true,
} as const;

/**
 * Running a Team is a Supporter feature: creating a workspace and managing one (profile,
 * events, announcements, invites, roles, shared builds, loot splits) need the owner on the
 * Supporter plan. Viewing, requesting to join, RSVPs and leaving stay open to every member.
 * Until billing is configured nothing is for sale, so nothing is locked.
 */
export const teamManagementActions = new Set([
  "profile",
  "edit-event",
  "invite",
  "revoke",
  "decide",
  "role",
  "remove",
  "transfer",
  "delete",
  "announcement",
  "remove-announcement",
  "event",
  "cancel-event",
  "share-build",
  "remove-build",
]);

export const supporterMessage = {
  create: "Creating a team workspace is a Supporter feature.",
  manage: "Team management needs the team's owner on the Supporter plan.",
};

export async function userIsSupporter(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: entitlementSelect });
  return isSupporter(user);
}

/** True when this user may create a workspace right now. */
export async function canCreateTeam(userId: string) {
  return !billingEnabled() || (await userIsSupporter(userId));
}

/** True when the team's owner holds the plan that keeps its management open. */
export async function teamManagementOpen(groupId: string) {
  if (!billingEnabled()) return true;
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { owner: { select: entitlementSelect } },
  });
  return isSupporter(group?.owner);
}

export async function requireTeamCreation(userId: string) {
  if (!(await canCreateTeam(userId))) throw new HttpError(402, supporterMessage.create);
}
export async function requireTeamManagement(groupId: string, action?: string) {
  if (action !== undefined && !teamManagementActions.has(action)) return;
  if (!(await teamManagementOpen(groupId))) throw new HttpError(402, supporterMessage.manage);
}
