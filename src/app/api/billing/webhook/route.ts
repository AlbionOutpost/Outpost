import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { applySubscription } from "@/lib/billing/plan";
import { getSubscription, stripeConfig, verifyWebhook } from "@/lib/billing/stripe";
import { logEvent } from "@/lib/logging";

const maxBody = 256 * 1024;
const subscriptionEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/**
 * Stripe → the account record. Only a request that carries a valid signature changes anything;
 * every write re-reads the subscription from Stripe so a replayed or reordered event cannot
 * leave the plan in an older state. Unknown event types are acknowledged and ignored.
 */
export const POST = apiHandler("billing.webhook", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  const payload = await req.text();
  if (payload.length > maxBody) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const event = await verifyWebhook(
    payload,
    req.headers.get("stripe-signature"),
    config.webhookSecret,
  );
  let subscriptionId: string | null = null;
  const object = event.data.object;
  if (event.type === "checkout.session.completed" && object.mode === "subscription")
    subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
  else if (subscriptionEvents.has(event.type))
    subscriptionId = typeof object.id === "string" ? object.id : null;
  if (!subscriptionId) return NextResponse.json({ received: true, ignored: event.type });
  const subscription = await getSubscription(config, subscriptionId);
  const userId = await applySubscription({
    customerId: subscription.customer,
    subscriptionId: subscription.id,
    status: subscription.status,
    periodEnd: subscription.current_period_end,
    userId: subscription.metadata?.outpostUserId || null,
  });
  logEvent("info", "billing_subscription", {
    operation: event.type,
    code: `${subscription.status}:${userId ? "matched" : "unmatched"}`,
  });
  return NextResponse.json({ received: true, matched: Boolean(userId) });
});
