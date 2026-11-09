import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { billingProfile, rememberCustomer, salesOpen } from "@/lib/billing/plan";
import { createCustomer, listSubscriptions, stripeConfig } from "@/lib/billing/stripe";
import { requireSettledCheckout, terminalSubscription } from "@/lib/billing/reconciliation";
import { beginCheckout, resolveCheckout, updateCheckout } from "@/lib/billing/checkout";
import { regionSchema } from "@/lib/albion/region-config";

/** Both order-page boxes, ticked by the buyer: the terms, and the immediate start with the
 * acknowledgment that the right of withdrawal expires (§ 356 Abs. 5 BGB). */
const consent = z.object({ terms: z.literal(true), immediateStart: z.literal(true) }).strict();

/** Starts a Supporter subscription: creates the Stripe customer once, then hands back the checkout page. */
export const POST = apiHandler("billing.checkout", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) throw new HttpError(503, "Billing is not configured yet");
  // Nothing is sold during the launch grant or before the terms are published.
  if (!salesOpen()) throw new HttpError(503, "The Supporter plan is not on sale yet");
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  if (!consent.safeParse(await boundedJson(req, 1024)).success)
    throw new HttpError(400, "Agree to the terms and the immediate start to continue.");
  const consentAt = new Date().toISOString();
  const profile = await billingProfile(auth.userId!);
  if (!profile) throw new HttpError(404, "Account not found");
  if (profile.plan === "SUPPORTER") throw new HttpError(409, "You already support Outpost");
  const region = regionSchema.catch("europe").parse(new URL(req.url).searchParams.get("region"));
  const origin = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    customerId = await createCustomer(config, profile);
    await rememberCustomer(profile.id, customerId);
  }
  const intent = await beginCheckout(profile.id, {
    customerId,
    priceId: config.priceId,
    successUrl: `${origin}/supporter?region=${region}&checkout=success`,
    cancelUrl: `${origin}/supporter?region=${region}&checkout=cancelled`,
    consentAt,
  });
  // Reserve current state first. Every caller, including concurrent reusers, must
  // verify provider state before resolving or creating this operation's session.
  const verifySubscriptions = async () => {
    const subscriptions = await listSubscriptions(config, intent.customerId);
    if (subscriptions.some((subscription) => !terminalSubscription(subscription.status)))
      throw new HttpError(409, "Manage your existing subscription before starting another.");
    return subscriptions;
  };
  await verifySubscriptions();
  const session = await resolveCheckout(config, intent);
  if (session.status !== "open") {
    // Completion may have happened after the first read. Empty/lagging history
    // cannot retire a completed checkout: its exact subscription must be terminal.
    requireSettledCheckout(session, await verifySubscriptions());
    await updateCheckout(profile.id, intent.key, null);
    throw new HttpError(
      409,
      "That checkout has finished. Refresh your plan before starting another.",
    );
  }
  if (!session.url) throw new HttpError(502, "Billing provider returned no checkout page");
  await updateCheckout(profile.id, intent.key, session.id);
  return NextResponse.json({ url: session.url });
});
