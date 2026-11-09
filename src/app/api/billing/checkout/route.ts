import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { billingProfile, rememberCustomer, salesOpen } from "@/lib/billing/plan";
import { createCustomer, listSubscriptions, stripeConfig } from "@/lib/billing/stripe";
import { terminalSubscription } from "@/lib/billing/reconciliation";
import {
  awaitingPayment,
  beginCheckout,
  orderPayment,
  resolveOrder,
  updateCheckout,
} from "@/lib/billing/checkout";

/** The order-page box, ticked by the buyer: the terms. No waiver of the right of withdrawal is
 * asked for: a withdrawal within 14 days is always refunded in full (owner, 9 Nov 2026). */
const consent = z.object({ terms: z.literal(true) }).strict();

/**
 * Starts a Supporter order for the on-site payment form. Creates the Stripe customer once,
 * reserves one durable order operation per account, then creates (or reuses) that operation's
 * `incomplete` subscription and hands back only its PaymentIntent's client secret. Nothing is
 * charged here: the browser confirms the payment with Stripe, and the plan changes only when the
 * signed webhook reports the subscription active.
 */
export const POST = apiHandler("billing.checkout", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) throw new HttpError(503, "Billing is not configured yet");
  // Nothing is sold during the launch grant or before the terms are published.
  if (!salesOpen()) throw new HttpError(503, "The Supporter plan is not on sale yet");
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  if (!consent.safeParse(await boundedJson(req, 1024)).success)
    throw new HttpError(400, "Agree to the terms to continue.");
  const consentAt = new Date().toISOString();
  const profile = await billingProfile(auth.userId!);
  if (!profile) throw new HttpError(404, "Account not found");
  if (profile.plan === "SUPPORTER") throw new HttpError(409, "You already support Outpost");
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    customerId = await createCustomer(config, profile);
    await rememberCustomer(profile.id, customerId);
  }
  // A finished or stale operation is retired once, then a fresh one is reserved.
  for (let attempt = 0; attempt < 2; attempt++) {
    const intent = await beginCheckout(profile.id, {
      customerId,
      priceId: config.priceId,
      consentAt,
    });
    // Every caller, including concurrent reusers, reads the provider history itself before
    // resolving or creating this operation's subscription.
    const history = await listSubscriptions(config, intent.customerId);
    if (
      history.some(
        (subscription) =>
          !terminalSubscription(subscription.status) && subscription.status !== "incomplete",
      )
    )
      throw new HttpError(409, "Manage your existing subscription before starting another.");
    if (intent.priceId !== config.priceId) {
      await updateCheckout(profile.id, intent.key, null);
      continue;
    }
    const subscription = await resolveOrder(config, intent);
    if (!intent.subscriptionId) await updateCheckout(profile.id, intent.key, subscription.id);
    if (subscription.status !== "incomplete" && !terminalSubscription(subscription.status))
      throw new HttpError(409, "Your payment went through. The plan reaches your account shortly.");
    const payment = orderPayment(subscription)?.intent;
    if (terminalSubscription(subscription.status) || payment?.status === "canceled") {
      // Expired after 23 hours unpaid, or closed: a new order starts over.
      await updateCheckout(profile.id, intent.key, null);
      continue;
    }
    if (payment?.status === "processing" || payment?.status === "succeeded")
      throw new HttpError(409, "Your payment is being confirmed. Reload this page in a minute.");
    if (!payment?.client_secret || !awaitingPayment(payment.status))
      throw new HttpError(502, "Billing provider returned no payment to confirm");
    return NextResponse.json({
      clientSecret: payment.client_secret,
      subscriptionId: subscription.id,
    });
  }
  throw new HttpError(409, "Your order changed. Try again.");
});
