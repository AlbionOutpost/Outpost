import { NextRequest, NextResponse } from "next/server";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser } from "@/lib/http";
import { billingProfile, rememberCustomer } from "@/lib/billing/plan";
import { createCheckoutSession, createCustomer, stripeConfig } from "@/lib/billing/stripe";
import { regionSchema } from "@/lib/albion/region-config";

/** Starts a Supporter subscription: creates the Stripe customer once, then hands back the checkout page. */
export const POST = apiHandler("billing.checkout", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) throw new HttpError(503, "Billing is not configured yet");
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
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
  const url = await createCheckoutSession(config, {
    customerId,
    userId: profile.id,
    successUrl: `${origin}/supporter?region=${region}&checkout=success`,
    cancelUrl: `${origin}/supporter?region=${region}&checkout=cancelled`,
  });
  return NextResponse.json({ url });
});
