import { db, databaseService } from "@/lib/db";

export type Plan = "FREE" | "SUPPORTER";
/** Stripe statuses that keep the Supporter benefits on. */
const activeStatuses = new Set(["active", "trialing", "past_due"]);

export const planForStatus = (status: string | null | undefined): Plan =>
  status && activeStatuses.has(status) ? "SUPPORTER" : "FREE";

export const isSupporter = (user: { plan?: string | null } | null | undefined) =>
  user?.plan === "SUPPORTER";

export type SubscriptionRecord = {
  customerId: string;
  subscriptionId: string;
  status: string;
  periodEnd: number | null;
  /** From the subscription's metadata; the customer id is the fallback match. */
  userId?: string | null;
};

/** Writes a subscription's state onto the account it belongs to. Returns the user id, or null when no account matches. */
async function localApplySubscription(record: SubscriptionRecord) {
  const user = await db.user.findFirst({
    where: record.userId
      ? { OR: [{ id: record.userId }, { stripeCustomerId: record.customerId }] }
      : { stripeCustomerId: record.customerId },
    select: { id: true, stripeSubscriptionId: true },
  });
  if (!user) return null;
  // A newer subscription on the same customer replaces the old one; an event for a
  // subscription this account no longer holds is ignored.
  if (user.stripeSubscriptionId && user.stripeSubscriptionId !== record.subscriptionId) {
    const other = await db.user.findUnique({
      where: { stripeSubscriptionId: record.subscriptionId },
      select: { id: true },
    });
    if (other && other.id !== user.id) return null;
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      plan: planForStatus(record.status),
      planStatus: record.status,
      planRenewsAt: record.periodEnd ? new Date(record.periodEnd * 1000) : null,
      stripeCustomerId: record.customerId,
      stripeSubscriptionId: record.subscriptionId,
    },
  });
  return user.id;
}
export const applySubscription: typeof localApplySubscription = (...args) =>
  databaseService("applySubscription", args) ?? localApplySubscription(...args);

async function localRememberCustomer(userId: string, customerId: string) {
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  return true;
}
export const rememberCustomer: typeof localRememberCustomer = (...args) =>
  databaseService("rememberCustomer", args) ?? localRememberCustomer(...args);

export const billingProfile = (userId: string) =>
  db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      planStatus: true,
      planRenewsAt: true,
      stripeCustomerId: true,
    },
  });
