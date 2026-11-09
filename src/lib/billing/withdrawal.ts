import { HttpError } from "@/lib/http-error";
import { terminalSubscription } from "./reconciliation";
import {
  cancelSubscriptionNow,
  listPaidInvoices,
  refundCharge,
  type StripeConfig,
  type StripeSubscription,
} from "./stripe";

const zone = "Europe/Berlin";
const dayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
/** Berlin wall-clock time of an instant, read as if it were UTC (ms). */
function berlinWall(ms: number) {
  const p = Object.fromEntries(dayParts.formatToParts(ms).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

/**
 * The last moment to withdraw (ms): the end of the 14th day after the day the contract was
 * made, in German time (§§ 355 Abs. 2, 187 Abs. 1, 188 Abs. 1 BGB). The day of the order does
 * not count, so an order at 23:00 on 1 March can be withdrawn until midnight after 15 March.
 */
export function withdrawalDeadline(startSeconds: number) {
  const wall = berlinWall(startSeconds * 1000);
  const day = new Date(wall);
  const midnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 15);
  // Midnight Berlin is midnight UTC shifted by Berlin's offset at that moment.
  return midnight - (berlinWall(midnight) - midnight) - 1;
}

/** When the contract was made: Stripe's subscription start, or its creation time. */
export const contractStart = (subscription: StripeSubscription) =>
  subscription.start_date ?? subscription.created;

/** The account's Supporter subscriptions that are still inside the withdrawal period. */
export function withinWithdrawal(
  subscriptions: StripeSubscription[],
  priceId: string,
  now = Date.now(),
) {
  return subscriptions.filter(
    (subscription) =>
      subscription.status !== "incomplete_expired" &&
      Number.isFinite(contractStart(subscription)) &&
      now <= withdrawalDeadline(contractStart(subscription)) &&
      subscription.items?.data.some((item) => item.price?.id === priceId),
  );
}

export type WithdrawalResult = {
  subscriptionId: string;
  startedAt: number;
  cancelled: boolean;
  refunds: { amount: number; currency: string }[];
};

/**
 * Withdraws one subscription for its own customer: ends it now (unless Stripe already ended
 * it) and refunds every paid charge in full. Each step is idempotent, so a retry after a
 * failure finishes the job without a second cancellation or refund. Returns null when there
 * was nothing left to do (ended and fully refunded already).
 */
export async function withdrawSubscription(
  config: StripeConfig,
  customerId: string,
  subscription: StripeSubscription,
): Promise<WithdrawalResult | null> {
  if (subscription.customer !== customerId) throw new HttpError(502, "Unexpected billing state");
  let cancelled = false;
  if (!terminalSubscription(subscription.status)) {
    const ended = await cancelSubscriptionNow(config, subscription.id);
    if (
      ended.customer !== customerId ||
      ended.id !== subscription.id ||
      ended.status !== "canceled"
    )
      throw new HttpError(502, "Unexpected billing provider state");
    cancelled = true;
  }
  const refunds: WithdrawalResult["refunds"] = [];
  for (const invoice of await listPaidInvoices(config, customerId, subscription.id)) {
    if (invoice.amount_paid <= 0) continue;
    const charge = invoice.charge;
    // A paid invoice without a card charge (credit balance, paid outside Stripe) needs a person.
    if (!charge || typeof charge === "string" || charge.customer !== customerId)
      throw new HttpError(502, "A payment needs a manual refund");
    if (charge.refunded || charge.amount_refunded >= charge.amount) continue;
    const refund = await refundCharge(config, charge.id, subscription.id);
    if (refund.charge !== charge.id || ["failed", "canceled"].includes(refund.status))
      throw new HttpError(502, "Unexpected billing provider state");
    refunds.push({ amount: refund.amount, currency: refund.currency });
  }
  if (!cancelled && !refunds.length) return null;
  return {
    subscriptionId: subscription.id,
    startedAt: contractStart(subscription),
    cancelled,
    refunds,
  };
}
