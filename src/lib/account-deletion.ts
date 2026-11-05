import { db, databaseService } from "./db";
import { Prisma } from "./prisma-runtime";
import { HttpError } from "./http-error";
import { retrySerialization } from "./serialization-retry";
import { billingProfile } from "./billing/plan";
import { parseCheckoutIntent, resolveCheckout, verifyCheckout } from "./billing/checkout";
import {
  stripeConfig,
  listSubscriptions,
  listCheckoutSessions,
  expireCheckoutSession,
  type StripeCheckout,
} from "./billing/stripe";
import {
  requireSettledCheckout,
  selectSupporterSubscription,
  terminalSubscription,
} from "./billing/reconciliation";

type BillingClearance = { customerId: string; expectedUpdatedAt: string };

/** No subscription is canceled implicitly. Unpaid checkout links are expired so they
 * cannot create a subscription after the account and its billing association disappear. */
export async function verifyDeletionBilling(userId: string): Promise<BillingClearance | null> {
  const profile = await billingProfile(userId);
  if (!profile) throw new HttpError(404, "Account not found");
  if (!profile.stripeCustomerId) {
    if (profile.stripeSubscriptionId || profile.billingCheckout || profile.plan === "SUPPORTER")
      throw new HttpError(409, "Billing association needs reconciliation before account deletion.");
    return null;
  }
  const config = stripeConfig();
  if (!config)
    throw new HttpError(
      503,
      "Billing verification is unavailable. Retry before deleting your account.",
    );
  const intent = parseCheckoutIntent(profile.billingCheckout);
  let trackedSession: StripeCheckout | undefined;
  if (intent) {
    if (intent.userId !== userId || intent.customerId !== profile.stripeCustomerId)
      throw new HttpError(409, "Billing association changed. Reload before deleting.");
    trackedSession = await resolveCheckout(config, intent);
    if (trackedSession.status === "open") {
      trackedSession = verifyCheckout(
        await expireCheckoutSession(config, trackedSession.id),
        intent,
      );
      if (trackedSession.status === "open")
        throw new HttpError(409, "Close the pending checkout before account deletion.");
    }
  }
  // Check every checkout before the final subscription read: a legacy checkout may
  // have completed while it was being inspected and created a new subscription.
  const sessions = await listCheckoutSessions(config, profile.stripeCustomerId);
  if (sessions.some((session) => !["complete", "expired"].includes(session.status)))
    throw new HttpError(
      409,
      "An open checkout still exists. Close it before deleting your account.",
    );
  const subscriptions = await listSubscriptions(config, profile.stripeCustomerId);
  // Validate complete provider records even though deletion checks all products.
  selectSupporterSubscription(subscriptions, config.priceId);
  if (subscriptions.some((subscription) => !terminalSubscription(subscription.status)))
    throw new HttpError(
      409,
      "Cancel your subscription in Manage subscription and wait for cancellation to finish before deleting your account.",
    );
  for (const session of sessions) requireSettledCheckout(session, subscriptions);
  if (trackedSession) requireSettledCheckout(trackedSession, subscriptions);
  return {
    customerId: profile.stripeCustomerId,
    expectedUpdatedAt: profile.updatedAt.toISOString(),
  };
}

async function localDeleteAccountRecord(userId: string, clearance: BillingClearance | null) {
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new HttpError(404, "Account not found");
        if (await tx.group.count({ where: { ownerId: userId } }))
          throw new HttpError(
            409,
            "Transfer group ownership or delete owned groups before deleting this account.",
          );
        if (
          user.stripeCustomerId ||
          user.stripeSubscriptionId ||
          user.billingCheckout ||
          user.plan === "SUPPORTER"
        ) {
          if (
            !clearance ||
            clearance.customerId !== user.stripeCustomerId ||
            clearance.expectedUpdatedAt !== user.updatedAt.toISOString()
          )
            throw new HttpError(
              409,
              "Billing changed. Retry account deletion after checking your subscription.",
            );
        }
        // Team comps belong to the team, not just their author: hand them to the team's owner
        // (never this user, who owns no team by now) instead of cascading them away.
        const shared = await tx.composition.findMany({
          where: { authorId: userId, groupId: { not: null }, visibility: "GROUP" },
          select: { id: true, group: { select: { ownerId: true } } },
        });
        const byOwner = new Map<string, string[]>();
        for (const comp of shared)
          if (comp.group)
            byOwner.set(comp.group.ownerId, [...(byOwner.get(comp.group.ownerId) ?? []), comp.id]);
        for (const [ownerId, ids] of byOwner)
          await tx.composition.updateMany({
            where: { id: { in: ids }, authorId: userId },
            data: { authorId: ownerId },
          });
        await tx.user.delete({ where: { id: userId } });
        return { deleted: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
export const deleteAccountRecord: typeof localDeleteAccountRecord = (...args) =>
  databaseService("deleteAccountRecord", args) ?? localDeleteAccountRecord(...args);
