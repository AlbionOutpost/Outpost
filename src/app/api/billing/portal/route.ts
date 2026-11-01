import { NextRequest, NextResponse } from "next/server";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser } from "@/lib/http";
import { billingProfile } from "@/lib/billing/plan";
import { createPortalSession, stripeConfig } from "@/lib/billing/stripe";
import { regionSchema } from "@/lib/albion/region-config";

/** Opens Stripe's customer portal: change the card, cancel, download invoices. */
export const POST = apiHandler("billing.portal", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) throw new HttpError(503, "Billing is not configured yet");
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const profile = await billingProfile(auth.userId!);
  if (!profile?.stripeCustomerId) throw new HttpError(404, "No billing record for this account");
  const region = regionSchema.catch("europe").parse(new URL(req.url).searchParams.get("region"));
  const origin = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  const url = await createPortalSession(config, {
    customerId: profile.stripeCustomerId,
    returnUrl: `${origin}/supporter?region=${region}`,
  });
  return NextResponse.json({ url });
});
