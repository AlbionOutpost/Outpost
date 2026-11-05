import { db, databaseService } from "@/lib/db";
import { HttpError } from "@/lib/http-error";
import { giftedSupporter } from "../admin/policy";

export type Plan = "FREE" | "SUPPORTER";
/** Stripe statuses that keep the Supporter benefits on. */
const activeStatuses = new Set(["active", "trialing", "past_due"]);

export const planForStatus = (status: string | null | undefined): Plan =>
  status && activeStatuses.has(status) ? "SUPPORTER" : "FREE";

export const isSupporter = (
  user:
    | {
        plan?: string | null;
        supporterGiftUntil?: Date | string | null;
        supporterGiftPermanent?: boolean;
      }
    | null
    | undefined,
) => user?.plan === "SUPPORTER" || giftedSupporter(user);

export type SubscriptionRecord = {
  customerId: string;
  subscriptionId: string | null;
  status: string;
  periodEnd: number | null;
  /** Account snapshot taken before retrieving the customer's subscriptions. */
  expectedUpdatedAt: string;
};

/** Writes a subscription's state onto the account it belongs to. Returns the user id, or null when no account matches. */
async function localApplySubscription(record: SubscriptionRecord) {
  const user = await db.user.findUnique({
    where: { stripeCustomerId: record.customerId },
    select: { id: true },
  });
  if (!user) return null;
  const expected = new Date(record.expectedUpdatedAt);
  if (!Number.isFinite(expected.getTime())) throw new HttpError(400, "Invalid billing revision");
  // Stripe calls happen before this write. Reject a snapshot if another webhook,
  // checkout or profile change won in the meantime; Stripe retries a 409 response.
  const changed = await db.user.updateMany({
    where: { id: user.id, stripeCustomerId: record.customerId, updatedAt: expected },
    data: {
      plan: planForStatus(record.status),
      planStatus: record.status,
      planRenewsAt: record.periodEnd ? new Date(record.periodEnd * 1000) : null,
      stripeCustomerId: record.customerId,
      stripeSubscriptionId: record.subscriptionId,
      updatedAt: new Date(Math.max(Date.now(), expected.getTime() + 1)),
    },
  });
  if (!changed.count) throw new HttpError(409, "Billing changed. Retry reconciliation.");
  return user.id;
}
export const applySubscription: typeof localApplySubscription = (...args) =>
  databaseService("applySubscription", args) ?? localApplySubscription(...args);

async function localRememberCustomer(userId: string, customerId: string) {
  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
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
      supporterGiftUntil: true,
      supporterGiftPermanent: true,
      planStatus: true,
      planRenewsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      billingCheckout: true,
      updatedAt: true,
    },
  });
