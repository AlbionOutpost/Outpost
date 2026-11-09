import { db, databaseService } from "@/lib/db";
import { HttpError } from "@/lib/http-error";
import { giftedSupporter } from "../admin/policy";
import { legalPublished } from "../legal";
import { billingEnabled } from "./stripe";

export type Plan = "FREE" | "SUPPORTER";
/** Stripe statuses that keep the Supporter benefits on. */
const activeStatuses = new Set(["active", "trialing", "past_due"]);

export const planForStatus = (status: string | null | undefined): Plan =>
  status && activeStatuses.has(status) ? "SUPPORTER" : "FREE";

/**
 * The launch grant (owner, 8 Nov 2026): every account is a lifetime Supporter, including
 * accounts that sign up later, without writing anything to them. While `closedAt` is null the
 * launch is on. To end it, set `closedAt` to that date: accounts created before it keep
 * Supporter for life; later ones need a gift (or the plan, if billing is ever switched on).
 * Outpost is free: the grant involves no payment.
 */
export const launchGrant: { closedAt: Date | null } = { closedAt: null };
/** True while every account, old or new, is covered by the launch grant. */
export const launchOpen = () => launchGrant.closedAt === null;

type Entitlement =
  | {
      plan?: string | null;
      supporterGiftUntil?: Date | string | null;
      supporterGiftPermanent?: boolean;
      createdAt?: Date | string | null;
    }
  | null
  | undefined;

/** The account (`user` is its row) holds the launch grant. */
export const launchSupporter = (user: Entitlement) =>
  !!user &&
  (launchOpen() ||
    (!!user.createdAt && new Date(user.createdAt).getTime() < launchGrant.closedAt!.getTime()));

/** Supporter from a stored plan or an admin gift, leaving the launch grant out. */
export const storedSupporter = (user: Entitlement) =>
  user?.plan === "SUPPORTER" || giftedSupporter(user);

/** The columns `showsBadge` reads. Select them for an author or member, then hand on only
 * `publicSupporter(row)`: gift dates, plan state and the preference never leave the server. */
export const badgeSelect = {
  plan: true,
  supporterGiftUntil: true,
  supporterGiftPermanent: true,
  showSupporterBadge: true,
} as const;
type BadgeRow = {
  plan?: string | null;
  supporterGiftUntil?: Date | string | null;
  supporterGiftPermanent?: boolean;
  showSupporterBadge?: boolean;
};
/** The public badge shows: a stored plan or a gift, and the player has not hidden it. The launch
 * grant shows none (owner, 9 Nov 2026: the badge is a paid benefit, optional and on by default).
 * A row without the preference column reads as hidden, so a query that forgets it never shows a
 * badge the player turned off. */
export const showsBadge = (row: BadgeRow | null | undefined) =>
  !!row?.showSupporterBadge && storedSupporter(row);

/** Swaps the badge columns for the public badge flag. */
export function publicSupporter<T extends BadgeRow>(row: T) {
  const { plan, supporterGiftUntil, supporterGiftPermanent, showSupporterBadge, ...rest } = row;
  return {
    ...rest,
    supporter: showsBadge({ plan, supporterGiftUntil, supporterGiftPermanent, showSupporterBadge }),
  };
}

/** Supporter from a stored plan, an admin gift or the launch grant. */
export const isSupporter = (user: Entitlement) => storedSupporter(user) || launchSupporter(user);

/** Where an account's Supporter status comes from, for labels; null when it has none. */
export const supporterSource = (user: Entitlement): "plan" | "gift" | "launch" | null =>
  user?.plan === "SUPPORTER"
    ? "plan"
    : giftedSupporter(user)
      ? "gift"
      : launchSupporter(user)
        ? "launch"
        : null;
/**
 * The plan is for sale: Stripe is configured, the launch grant is closed (nothing is sold while
 * every account holds it) and the legal page with the terms and withdrawal policy is published.
 * Cancelling never depends on this, only on `billingEnabled()`.
 */
export const salesOpen = () => billingEnabled() && !launchOpen() && legalPublished;

/** How an account's status reads: "Launch Supporter" marks the launch grant. */
export function supporterLabel(user: Entitlement) {
  const source = supporterSource(user);
  return source === "launch" ? "Launch Supporter" : source ? "Supporter" : "Free";
}

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
      createdAt: true,
      planStatus: true,
      planRenewsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      billingCheckout: true,
      updatedAt: true,
    },
  });
