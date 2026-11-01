import { HttpError } from "@/lib/http-error";

/**
 * A small Stripe REST client. The SDK is not used: these four calls are all Outpost needs,
 * `fetch` works the same on Node and Cloudflare, and the web bundle stays small. Secrets are
 * read at call time so a missing key degrades to "billing not configured", never to a crash.
 */
export type StripeConfig = { secretKey: string; webhookSecret: string; priceId: string };

export function stripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_SUPPORTER;
  if (!secretKey || !webhookSecret || !priceId) return null;
  return { secretKey, webhookSecret, priceId };
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
  method: "GET" | "POST",
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
  const query = data && method === "GET" ? `?${form(data)}` : "";
  const response = await fetch(`${api}${path}${query}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(15000),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  } & T;
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

export async function createCheckoutSession(
  config: StripeConfig,
  input: { customerId: string; userId: string; successUrl: string; cancelUrl: string },
) {
  const session = await call<{ id: string; url: string | null }>(
    config,
    "POST",
    "/checkout/sessions",
    {
      mode: "subscription",
      customer: input.customerId,
      "line_items[0][price]": config.priceId,
      "line_items[0][quantity]": 1,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      "subscription_data[metadata][outpostUserId]": input.userId,
      allow_promotion_codes: "true",
      billing_address_collection: "auto",
    },
  );
  if (!session.url) throw new HttpError(502, "Billing provider returned no checkout page");
  return session.url;
}

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
  customer: string;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data: { price: { id: string } }[] };
};
export const getSubscription = (config: StripeConfig, id: string) =>
  call<StripeSubscription>(config, "GET", `/subscriptions/${encodeURIComponent(id)}`);

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
