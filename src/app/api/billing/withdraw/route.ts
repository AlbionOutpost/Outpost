import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { billingProfile } from "@/lib/billing/plan";
import { listSubscriptions, stripeConfig } from "@/lib/billing/stripe";
import {
  withdrawSubscription,
  withinWithdrawal,
  type WithdrawalResult,
} from "@/lib/billing/withdrawal";
import { logEvent } from "@/lib/logging";

/** The § 356a BGB confirmation. The body names no subscription or customer: those come from the
 * caller's own account row and Stripe. */
const withdrawInput = z.object({ confirm: z.literal(true) }).strict();
const contact = "contact@albionoutpost.com";

/**
 * Withdraws the caller's Supporter contracts that are still inside the 14-day period: ends each
 * one now and refunds every payment in full (owner, 9 Nov 2026: no deduction for days used).
 * Ownership is the Stripe customer stored on the signed-in account; the subscriptions and their
 * start times are re-read from Stripe. The plan itself changes only through the signed webhook
 * when Stripe reports the subscription deleted. Stripe's refund email is the receipt.
 */
export const POST = apiHandler("billing.withdraw", async (req: NextRequest) => {
  const config = stripeConfig();
  if (!config) throw new HttpError(503, "Billing is not configured");
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  withdrawInput.parse(await boundedJson(req, 1024));
  const profile = await billingProfile(auth.userId!);
  const customerId = profile?.stripeCustomerId;
  if (!customerId) throw new HttpError(404, "There is no contract on this account.");
  const receivedAt = new Date();
  const open = withinWithdrawal(
    (await listSubscriptions(config, customerId)).filter((s) => s.customer === customerId),
    config.priceId,
    receivedAt.getTime(),
  );
  if (!open.length)
    throw new HttpError(
      404,
      "No contract on this account is inside the 14-day withdrawal period. You can still cancel to the end of the paid month.",
    );
  const done: WithdrawalResult[] = [];
  try {
    for (const subscription of open) {
      const result = await withdrawSubscription(config, customerId, subscription);
      if (result) done.push(result);
    }
  } catch {
    // Steps already taken stay taken (each is idempotent); a retry finishes the rest.
    logEvent("error", "billing_withdraw", { code: `failed:${done.length}/${open.length}` });
    throw new HttpError(
      502,
      `The withdrawal did not go through completely. Try again, or write to ${contact}: a withdrawal by email counts too.`,
    );
  }
  if (!done.length) throw new HttpError(409, "This contract is already withdrawn and refunded.");
  logEvent("info", "billing_withdraw", { code: `withdrawn:${done.length}` });
  return NextResponse.json({
    receivedAt: receivedAt.toISOString(),
    contracts: done.map((result) => ({
      startedAt: new Date(result.startedAt * 1000).toISOString(),
      refunds: result.refunds,
    })),
  });
});
