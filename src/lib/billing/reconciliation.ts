import { HttpError } from "@/lib/http-error";
import { planForStatus } from "./plan";
import type { StripeCheckout, StripeSubscription } from "./stripe";

export const terminalSubscription = (status: string) =>
  status === "canceled" || status === "incomplete_expired";

/** A completed subscription checkout is not settled merely because a possibly
 * lagging history is empty. Its exact subscription must be present and terminal. */
export function requireSettledCheckout(
  session: StripeCheckout,
  subscriptions: StripeSubscription[],
) {
  if (session.mode !== "subscription" || session.status !== "complete") return;
  const subscription = subscriptions.find(
    (record) => record.id === session.subscription && record.customer === session.customer,
  );
  if (!subscription || !terminalSubscription(subscription.status))
    throw new HttpError(409, "Completed checkout is awaiting billing reconciliation. Retry later.");
}

/** Any live matching subscription keeps entitlement. A terminal older subscription
 * cannot displace an active replacement, regardless of the event that triggered this read. */
export function selectSupporterSubscription(subscriptions: StripeSubscription[], priceId: string) {
  for (const subscription of subscriptions)
    if (
      typeof subscription.status !== "string" ||
      !Number.isFinite(subscription.created) ||
      !Array.isArray(subscription.items?.data)
    )
      throw new HttpError(502, "Incomplete subscription state");
  const rank = (subscription: StripeSubscription) =>
    planForStatus(subscription.status) === "SUPPORTER"
      ? 2
      : terminalSubscription(subscription.status)
        ? 0
        : 1;
  return (
    subscriptions
      .filter((subscription) => subscription.items!.data.some((item) => item.price?.id === priceId))
      .sort((a, b) => rank(b) - rank(a) || b.created - a.created || a.id.localeCompare(b.id))[0] ??
    null
  );
}
