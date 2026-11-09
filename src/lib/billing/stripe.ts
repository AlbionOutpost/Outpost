import { HttpError } from "@/lib/http-error";
import { readBoundedText } from "@/lib/request-body";

/**
 * A small Stripe REST client. The SDK is not used: these few calls are all Outpost needs,
 * `fetch` works the same on Node and Cloudflare, and the web bundle stays small. Secrets are
 * read at call time so a missing key degrades to "billing not configured", never to a crash.
 * Every call uses API version 2024-06-20, whose invoices carry `payment_intent` and `charge`.
 */
export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  priceId: string;
  /** Not a secret: Stripe.js in the browser needs it to show the payment form. */
  publishableKey: string;
};

export function stripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_SUPPORTER;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!secretKey || !webhookSecret || !priceId || !publishableKey) return null;
  return { secretKey, webhookSecret, priceId, publishableKey };
}
export const billingEnabled = () => stripeConfig() !== null;

const api = "https://api.stripe.com/v1";
function form(data: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) if (v !== undefined) body.set(k, String(v));
  return body;
}
async function call<T>(
  config: StripeConfig,
  method: "GET" | "POST" | "DELETE",
  path: string,
  data?: Record<string, string | number | undefined>,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secretKey}`,
    "Stripe-Version": "2024-06-20",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  let body: URLSearchParams | undefined;
  if (data && method === "POST") {
    body = form(data);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const query = data && method !== "POST" ? `?${form(data)}` : "";
  const response = await fetch(`${api}${path}${query}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
    cache: "no-store",
  });
  let json: {
    error?: { message?: string; code?: string };
  } & T;
  try {
    json = JSON.parse(await readBoundedText(response, 2 * 1024 * 1024));
    if (!json || typeof json !== "object") throw new Error("Invalid provider payload");
  } catch {
    throw new HttpError(502, "Invalid billing provider response");
  }
  if (!response.ok)
    throw new HttpError(
      502,
      `Billing provider error${json.error?.code ? ` (${json.error.code})` : ""}`,
    );
  return json;
}

export type StripePrice = {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
  product: string;
};
export const getPrice = (config: StripeConfig) =>
  call<StripePrice>(config, "GET", `/prices/${encodeURIComponent(config.priceId)}`);

export async function createCustomer(
  config: StripeConfig,
  user: { id: string; name?: string | null; email?: string | null },
) {
  const customer = await call<{ id: string }>(
    config,
    "POST",
    "/customers",
    {
      name: user.name || undefined,
      email: user.email || undefined,
      "metadata[outpostUserId]": user.id,
    },
    `customer-${user.id}`,
  );
  return customer.id;
}

/**
 * Starts the Supporter subscription for the on-site payment form: Stripe creates it
 * `incomplete` with an open first invoice whose PaymentIntent the browser confirms. Nothing is
 * charged here, and an unpaid subscription expires on Stripe's side after 23 hours. The key and
 * the parameters come from the saved order operation, so a retry replays the same request.
 */
export const createSubscription = (
  config: StripeConfig,
  input: { customerId: string; userId: string; priceId: string; key: string; consentAt: string },
) =>
  call<StripeSubscription>(
    config,
    "POST",
    "/subscriptions",
    {
      customer: input.customerId,
      "items[0][price]": input.priceId,
      "items[0][quantity]": 1,
      payment_behavior: "default_incomplete",
      "payment_settings[save_default_payment_method]": "on_subscription",
      "expand[0]": "latest_invoice.payment_intent",
      "metadata[outpostUserId]": input.userId,
      "metadata[outpostCheckoutId]": input.key,
      // Proof of the order-page consent to the terms, kept on the subscription.
      "metadata[outpostConsentAt]": input.consentAt,
    },
    `subscription-${input.key}`,
  );

/** One subscription with its first open invoice and that invoice's PaymentIntent. */
export const getOrderSubscription = (config: StripeConfig, id: string) =>
  call<StripeSubscription>(config, "GET", `/subscriptions/${encodeURIComponent(id)}`, {
    "expand[]": "latest_invoice.payment_intent",
  });

/** Voids an unpaid invoice so it can never be paid; Stripe refuses once a payment is under way. */
export const voidInvoice = (config: StripeConfig, id: string) =>
  call<{ id: string; status: string }>(
    config,
    "POST",
    `/invoices/${encodeURIComponent(id)}/void`,
    undefined,
    `void-${id}`,
  );

/** Ends an unpaid subscription whose invoice is already void. */
export const cancelUnpaidSubscription = (config: StripeConfig, id: string) =>
  call<StripeSubscription>(
    config,
    "DELETE",
    `/subscriptions/${encodeURIComponent(id)}`,
    undefined,
    `order-cancel-${id}`,
  );

export async function createPortalSession(
  config: StripeConfig,
  input: { customerId: string; returnUrl: string },
) {
  const session = await call<{ url: string }>(config, "POST", "/billing_portal/sessions", {
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return session.url;
}

export type StripeSubscription = {
  id: string;
  created: number;
  /** When the contract began (the withdrawal period counts from here). */
  start_date?: number;
  customer: string;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data: { price: { id: string } }[] };
  /** Expanded by `createSubscription` and `getOrderSubscription`, an id otherwise. */
  latest_invoice?: StripeOrderInvoice | string | null;
};
export type StripePaymentIntent = { id: string; status: string; client_secret: string | null };
export type StripeOrderInvoice = {
  id: string;
  status: string;
  customer: string;
  payment_intent: StripePaymentIntent | string | null;
};
export const getSubscription = (config: StripeConfig, id: string) =>
  call<StripeSubscription>(config, "GET", `/subscriptions/${encodeURIComponent(id)}`);

/**
 * Cancels at the end of the paid period (§ 312k BGB "ordentliche Kündigung"). The note and
 * kind land in `cancellation_details` and metadata for the operator; Stripe keeps the plan
 * active until `current_period_end`, then the webhook ends it.
 */
export const cancelSubscriptionAtPeriodEnd = (
  config: StripeConfig,
  id: string,
  input: { kind: "ordinary" | "extraordinary"; reason?: string; receivedAt: string },
) =>
  call<StripeSubscription>(config, "POST", `/subscriptions/${encodeURIComponent(id)}`, {
    cancel_at_period_end: "true",
    "cancellation_details[comment]": input.reason || undefined,
    "metadata[outpostCancelKind]": input.kind,
    "metadata[outpostCancelReceivedAt]": input.receivedAt,
  });

/**
 * Ends a subscription now, for a withdrawal (§ 355 BGB). No proration credit and no final
 * invoice: the refund covers every payment. The parameters never vary, so a retry under the
 * same idempotency key replays the first answer instead of failing.
 */
export const cancelSubscriptionNow = (config: StripeConfig, id: string) =>
  call<StripeSubscription>(
    config,
    "DELETE",
    `/subscriptions/${encodeURIComponent(id)}`,
    { prorate: "false", invoice_now: "false", "cancellation_details[comment]": "Withdrawal" },
    `withdraw-cancel-${id}`,
  );

export type StripeCharge = {
  id: string;
  customer: string | null;
  amount: number;
  amount_refunded: number;
  refunded: boolean;
  currency: string;
};
export type StripeInvoice = {
  id: string;
  customer: string;
  subscription: string | null;
  status: string;
  amount_paid: number;
  currency: string;
  charge: StripeCharge | string | null;
};

/** A subscription's paid invoices with their charges, or a failure: never a partial list. */
export async function listPaidInvoices(
  config: StripeConfig,
  customerId: string,
  subscriptionId: string,
) {
  const list = await call<{ data: StripeInvoice[]; has_more: boolean }>(
    config,
    "GET",
    "/invoices",
    {
      customer: customerId,
      subscription: subscriptionId,
      status: "paid",
      limit: 100,
      "expand[]": "data.charge",
    },
  );
  if (
    !Array.isArray(list.data) ||
    list.has_more !== false ||
    list.data.some(
      (invoice) =>
        !invoice ||
        typeof invoice.id !== "string" ||
        invoice.customer !== customerId ||
        invoice.subscription !== subscriptionId,
    )
  )
    throw new HttpError(502, "Invalid billing provider list");
  return list.data;
}

/**
 * Refunds what is left of a charge, in full. The key is the charge, so a retry or a second
 * request never refunds twice: Stripe replays the first refund for 24 hours, and after that
 * the caller sees `refunded` on the charge and skips it.
 */
export const refundCharge = (config: StripeConfig, chargeId: string, subscriptionId: string) =>
  call<{ id: string; status: string; amount: number; currency: string; charge: string }>(
    config,
    "POST",
    "/refunds",
    {
      charge: chargeId,
      reason: "requested_by_customer",
      "metadata[outpostWithdrawal]": subscriptionId,
    },
    `withdraw-refund-${chargeId}`,
  );

/** Fetch complete customer histories, or fail without changing local entitlements. */
async function customerList<T extends { id: string; customer: string }>(
  config: StripeConfig,
  path: string,
  customerId: string,
  extra: Record<string, string> = {},
): Promise<T[]> {
  const records: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await call<{ data: T[]; has_more: boolean }>(config, "GET", path, {
      ...extra,
      customer: customerId,
      limit: 100,
      starting_after: cursor,
    });
    if (
      !Array.isArray(list.data) ||
      list.data.length > 100 ||
      typeof list.has_more !== "boolean" ||
      list.data.some((row) => !row || typeof row.id !== "string" || row.customer !== customerId)
    )
      throw new HttpError(502, "Invalid billing provider list");
    records.push(...list.data);
    if (!list.has_more) return records;
    const last = list.data.at(-1)?.id;
    if (!last || last === cursor) throw new HttpError(502, "Invalid billing provider pagination");
    cursor = last;
  }
  throw new HttpError(503, "Billing history requires reconciliation before this change");
}

export const listSubscriptions = (config: StripeConfig, customerId: string) =>
  customerList<StripeSubscription>(config, "/subscriptions", customerId, { status: "all" });

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Verifies a Stripe-Signature header (v1 scheme, HMAC-SHA256 over `${t}.${payload}`) with a
 * constant-time comparison and a five-minute tolerance, then returns the parsed event.
 */
export async function verifyWebhook(
  payload: string,
  signature: string | null,
  secret: string,
  now = Date.now(),
  toleranceSeconds = 300,
): Promise<{ id: string; type: string; data: { object: Record<string, unknown> } }> {
  if (!signature) throw new HttpError(400, "Missing signature");
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.split("=", 2) as [string, string]),
  );
  const timestamp = Number(parts.t);
  const expectedSignatures = signature
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!Number.isFinite(timestamp) || !expectedSignatures.length)
    throw new HttpError(400, "Malformed signature");
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds)
    throw new HttpError(400, "Signature outside tolerance");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = hex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`)),
  );
  const matches = expectedSignatures.some(
    (candidate) => candidate.length === digest.length && timingSafeEqual(candidate, digest),
  );
  if (!matches) throw new HttpError(400, "Invalid signature");
  const event = JSON.parse(payload) as { id?: string; type?: string; data?: { object?: unknown } };
  if (typeof event.id !== "string" || typeof event.type !== "string" || !event.data?.object)
    throw new HttpError(400, "Malformed event");
  return event as { id: string; type: string; data: { object: Record<string, unknown> } };
}
function timingSafeEqual(a: string, b: string) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
