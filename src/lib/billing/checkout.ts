import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, databaseService } from "@/lib/db";
import { Prisma } from "@/lib/prisma-runtime";
import { HttpError } from "@/lib/http-error";
import { retrySerialization } from "@/lib/serialization-retry";
import {
  createCheckoutSession,
  getCheckoutSession,
  listCheckoutSessions,
  type StripeConfig,
  type StripeCheckout,
} from "./stripe";

const checkoutIntent = z.object({
  key: z.string().uuid(),
  customerId: z.string().min(1),
  userId: z.string().min(1),
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  sessionId: z.string().min(1).optional(),
  /** Order-page consent time (ISO). Optional: operations saved before it existed lack it. */
  consentAt: z.string().datetime().optional(),
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
  input: Omit<CheckoutIntent, "key" | "sessionId" | "userId">,
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

async function localUpdateCheckout(userId: string, key: string, sessionId: string | null) {
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        const intent = parseCheckoutIntent(user?.billingCheckout);
        if (!user || !intent || intent.key !== key)
          throw new HttpError(409, "Billing checkout changed");
        // A null session closes only the caller's verified completed/expired operation.
        await tx.user.update({
          where: { id: userId },
          data: {
            billingCheckout: sessionId ? { ...intent, sessionId } : Prisma.DbNull,
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

export function verifyCheckout(session: StripeCheckout, intent: CheckoutIntent) {
  if (
    session.customer !== intent.customerId ||
    session.mode !== "subscription" ||
    session.metadata?.outpostCheckoutId !== intent.key ||
    !["open", "complete", "expired"].includes(session.status)
  )
    throw new HttpError(502, "Unexpected billing checkout state");
  return session;
}

/** Recovery after a crash uses the exact original request and key. Search retained
 * sessions first, so expiration of Stripe's idempotency cache never creates a duplicate. */
export async function resolveCheckout(config: StripeConfig, intent: CheckoutIntent) {
  if (intent.sessionId)
    return verifyCheckout(await getCheckoutSession(config, intent.sessionId), intent);
  const found = (await listCheckoutSessions(config, intent.customerId)).filter(
    (session) => session.metadata?.outpostCheckoutId === intent.key,
  );
  if (found.length > 1)
    throw new HttpError(503, "Duplicate checkout operations need reconciliation");
  return verifyCheckout(
    found[0] ?? (await createCheckoutSession(config, intent, intent.key)),
    intent,
  );
}
