import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, databaseService } from "@/lib/db";
import { Prisma } from "@/lib/prisma-runtime";
import { HttpError } from "@/lib/http-error";
import { retrySerialization } from "@/lib/serialization-retry";
import {
  cancelUnpaidSubscription,
  createSubscription,
  getOrderSubscription,
  listSubscriptions,
  voidInvoice,
  type StripeConfig,
  type StripeSubscription,
} from "./stripe";

/**
 * The durable order operation on `User.billingCheckout`: one per account at a time. Concurrent
 * orders reuse it, so they share its key, consent time and therefore one Stripe subscription.
 */
const checkoutIntent = z.object({
  key: z.string().uuid(),
  customerId: z.string().min(1),
  userId: z.string().min(1),
  priceId: z.string().min(1),
  /** The subscription this operation created, once known. */
  subscriptionId: z.string().min(1).optional(),
  /** Order-page consent time (ISO), sent to Stripe as `outpostConsentAt`. */
  consentAt: z.string().datetime(),
});
export type CheckoutIntent = z.infer<typeof checkoutIntent>;
export function parseCheckoutIntent(value: unknown): CheckoutIntent | null {
  if (value === null || value === undefined) return null;
  const parsed = checkoutIntent.safeParse(value);
  if (!parsed.success) throw new HttpError(503, "Billing checkout state needs reconciliation");
  return parsed.data;
}

async function localBeginCheckout(
  userId: string,
  input: Omit<CheckoutIntent, "key" | "subscriptionId" | "userId">,
) {
  const proposed = checkoutIntent.parse({ ...input, userId, key: randomUUID() });
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.stripeCustomerId !== input.customerId)
          throw new HttpError(409, "Billing account changed");
        const existing = parseCheckoutIntent(user.billingCheckout);
        if (existing) {
          if (existing.userId !== userId || existing.customerId !== input.customerId)
            throw new HttpError(409, "Billing checkout ownership changed");
          return existing;
        }
        if (user.plan === "SUPPORTER") throw new HttpError(409, "You already support Outpost");
        await tx.user.update({
          where: { id: userId },
          data: {
            billingCheckout: proposed,
            updatedAt: new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1)),
          },
        });
        return proposed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
export const beginCheckout: typeof localBeginCheckout = (...args) =>
  databaseService("beginCheckout", args) ?? localBeginCheckout(...args);

async function localUpdateCheckout(userId: string, key: string, subscriptionId: string | null) {
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        const intent = parseCheckoutIntent(user?.billingCheckout);
        if (!user || !intent || intent.key !== key)
          throw new HttpError(409, "Billing checkout changed");
        // A null subscription closes only the caller's own, verified operation.
        await tx.user.update({
          where: { id: userId },
          data: {
            billingCheckout: subscriptionId ? { ...intent, subscriptionId } : Prisma.DbNull,
            updatedAt: new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1)),
          },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
export const updateCheckout: typeof localUpdateCheckout = (...args) =>
  databaseService("updateCheckout", args) ?? localUpdateCheckout(...args);

/** The subscription belongs to this operation: same customer, key and price. */
export function verifyOrder(subscription: StripeSubscription, intent: CheckoutIntent) {
  if (
    subscription.customer !== intent.customerId ||
    subscription.metadata?.outpostCheckoutId !== intent.key ||
    !subscription.items?.data.some((item) => item.price?.id === intent.priceId) ||
    typeof subscription.status !== "string"
  )
    throw new HttpError(502, "Unexpected billing order state");
  return subscription;
}

/** Recovery after a crash uses the exact original request and key. Search the customer's
 * subscriptions first, so expiry of Stripe's idempotency cache never creates a duplicate. */
export async function resolveOrder(config: StripeConfig, intent: CheckoutIntent) {
  let id = intent.subscriptionId;
  if (!id) {
    const found = (await listSubscriptions(config, intent.customerId)).filter(
      (subscription) => subscription.metadata?.outpostCheckoutId === intent.key,
    );
    if (found.length > 1) throw new HttpError(503, "Duplicate billing orders need reconciliation");
    if (!found[0]) return verifyOrder(await createSubscription(config, intent), intent);
    id = found[0].id;
  }
  return verifyOrder(await getOrderSubscription(config, id), intent);
}

/** The first invoice and its PaymentIntent, when Stripe expanded them for this customer. */
export function orderPayment(subscription: StripeSubscription) {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string" || invoice.customer !== subscription.customer)
    return null;
  const intent = typeof invoice.payment_intent === "object" ? invoice.payment_intent : null;
  return { invoice, intent };
}

/** The PaymentIntent still waits for the buyer: the browser may (re)try to pay it. */
export const awaitingPayment = (status: string | undefined) =>
  status === "requires_payment_method" ||
  status === "requires_confirmation" ||
  status === "requires_action";

/**
 * Makes an unpaid order impossible to pay, for account deletion: voids its open first invoice
 * (Stripe refuses once a payment is processing or done, so a paid order is never cancelled
 * here), then ends the subscription. Returns false when the order cannot be closed.
 */
export async function closeUnpaidOrder(config: StripeConfig, subscription: StripeSubscription) {
  if (subscription.status !== "incomplete") return false;
  const payment = orderPayment(subscription);
  if (!payment) return false;
  if (payment.invoice.status === "open") {
    try {
      await voidInvoice(config, payment.invoice.id);
    } catch {
      return false;
    }
  } else if (payment.invoice.status !== "void") return false;
  const ended = await cancelUnpaidSubscription(config, subscription.id);
  return ended.customer === subscription.customer && ended.status === "canceled";
}
