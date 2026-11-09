import { HttpError } from "@/lib/http-error";
import { planForStatus } from "./plan";
import type { StripeSubscription } from "./stripe";

export const terminalSubscription = (status: string) =>
  status === "canceled" || status === "incomplete_expired";

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
