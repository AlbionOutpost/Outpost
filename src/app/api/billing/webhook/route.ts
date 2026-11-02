import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { applySubscription } from "@/lib/billing/plan";
import {
  getSubscription,
  listSubscriptions,
  stripeConfig,
  verifyWebhook,
} from "@/lib/billing/stripe";
import { selectSupporterSubscription } from "@/lib/billing/reconciliation";
import { db } from "@/lib/db";
import { readBoundedText } from "@/lib/request-body";
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
 * Reconcile all of the customer's subscriptions for the configured price. The event's
 * subscription may be an old canceled one; it is not the entitlement authority.
 */
export const POST = apiHandler("billing.webhook", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  const payload = await readBoundedText(req, maxBody);
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
  const triggering = await getSubscription(config, subscriptionId);
  const account = await db.user.findUnique({
    where: { stripeCustomerId: triggering.customer },
    select: { updatedAt: true },
  });
  if (!account) return NextResponse.json({ received: true, matched: false });
  const subscription = selectSupporterSubscription(
    await listSubscriptions(config, triggering.customer),
    config.priceId,
  );
  const userId = await applySubscription({
    customerId: triggering.customer,
    subscriptionId: subscription?.id ?? null,
    status: subscription?.status ?? "none",
    periodEnd: subscription?.current_period_end ?? null,
    expectedUpdatedAt: account.updatedAt.toISOString(),
  });
  logEvent("info", "billing_subscription", {
    operation: event.type,
    code: `${subscription?.status ?? "none"}:${userId ? "matched" : "unmatched"}`,
  });
  return NextResponse.json({ received: true, matched: Boolean(userId) });
});
