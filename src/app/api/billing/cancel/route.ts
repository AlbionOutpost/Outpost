import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { billingProfile } from "@/lib/billing/plan";
import { terminalSubscription } from "@/lib/billing/reconciliation";
import {
  cancelSubscriptionAtPeriodEnd,
  listSubscriptions,
  stripeConfig,
} from "@/lib/billing/stripe";
import { logEvent } from "@/lib/logging";

/** The § 312k BGB confirmation: ordinary (end of the paid month) or extraordinary with a reason.
 * The body names no subscription or customer: those come from the caller's own account row. */
const cancelInput = z
  .object({
    kind: z.enum(["ordinary", "extraordinary"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((input) => input.kind === "ordinary" || (input.reason?.length ?? 0) >= 3, {
    path: ["reason"],
  });

/**
 * Cancels the caller's Supporter subscription at the end of the paid period. Ownership is the
 * Stripe customer stored on the signed-in account, re-read now; every subscription the change
 * touches is listed for that customer by Stripe. The plan stays on until the period ends, then
 * the signed webhook ends it. Stripe's own email confirms the cancellation.
 */
export const POST = apiHandler("billing.cancel", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) throw new HttpError(503, "Billing is not configured");
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const input = cancelInput.parse(await boundedJson(req, 4096));
  const profile = await billingProfile(auth.userId!);
  const customerId = profile?.stripeCustomerId;
  if (!customerId) throw new HttpError(404, "There is no subscription on this account.");
  const live = (await listSubscriptions(config, customerId)).filter(
    (subscription) =>
      subscription.customer === customerId &&
      !terminalSubscription(subscription.status) &&
      // An unpaid order is no contract to cancel; it expires on Stripe's side after 23 hours.
      subscription.status !== "incomplete" &&
      subscription.items?.data.some((item) => item.price?.id === config.priceId),
  );
  if (!live.length) throw new HttpError(404, "There is no subscription on this account.");
  const receivedAt = new Date().toISOString();
  const ends: number[] = [];
  for (const subscription of live) {
    const result = subscription.cancel_at_period_end
      ? subscription
      : await cancelSubscriptionAtPeriodEnd(config, subscription.id, {
          kind: input.kind,
          reason: input.reason,
          receivedAt,
        });
    if (result.customer !== customerId || !result.cancel_at_period_end)
      throw new HttpError(502, "Unexpected billing provider state");
    if (result.current_period_end) ends.push(result.current_period_end);
  }
  logEvent("info", "billing_cancel", { operation: input.kind, code: `scheduled:${live.length}` });
  return NextResponse.json({
    receivedAt,
    endsAt: ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null,
    kind: input.kind,
  });
});
