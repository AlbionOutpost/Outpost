import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* The on-site order route against a stateful fake Stripe that honours idempotency keys: one
 * durable operation per account, one `incomplete` subscription per operation, and only its
 * PaymentIntent's client secret goes back. Denied requests make no Stripe call. Account deletion
 * closes an unpaid order so it can never be paid afterwards. */
type Intent = Record<string, string | undefined> & { key: string };
type Profile = {
  id: string;
  name: string;
  email: null;
  plan: string;
  stripeCustomerId: string | null;
  billingCheckout: Intent | null;
  stripeSubscriptionId: null;
  updatedAt: Date;
};
type Sub = {
  id: string;
  customer: string;
  status: string;
  created: number;
  current_period_end: null;
  metadata: Record<string, string>;
  items: { data: { price: { id: string } }[] };
  latest_invoice: string;
};
type Invoice = { id: string; status: string; customer: string; payment_intent: string };
type Payment = { id: string; status: string; client_secret: string };
const m = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  onSale: true,
  profiles: new Map<string, Profile>(),
  subscriptions: [] as Sub[],
  invoices: new Map<string, Invoice>(),
  payments: new Map<string, Payment>(),
  replies: new Map<string, unknown>(),
  calls: [] as string[],
  created: [] as URLSearchParams[],
  fail: null as null | string,
}));
vi.mock("next-auth", () => ({ getServerSession: async () => m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/billing/plan", () => ({
  billingProfile: async (id: string) => m.profiles.get(id) ?? null,
  rememberCustomer: async (id: string, customer: string) => {
    m.profiles.get(id)!.stripeCustomerId = customer;
    return true;
  },
  salesOpen: () => m.onSale,
  planForStatus: (status: string) =>
    ["active", "trialing", "past_due"].includes(status) ? "SUPPORTER" : "FREE",
}));
// The operation store, as the serializable transaction keeps it: one per account.
vi.mock("@/lib/billing/checkout", async (original) => {
  const real = await original<typeof import("@/lib/billing/checkout")>();
  return {
    ...real,
    beginCheckout: async (userId: string, input: Record<string, string>) => {
      const user = m.profiles.get(userId)!;
      user.billingCheckout ??= { ...input, userId, key: crypto.randomUUID() };
      return { ...user.billingCheckout };
    },
    updateCheckout: async (userId: string, key: string, subscriptionId: string | null) => {
      const user = m.profiles.get(userId)!;
      if (user.billingCheckout?.key !== key) throw new Error("Billing checkout changed");
      user.billingCheckout = subscriptionId ? { ...user.billingCheckout, subscriptionId } : null;
      return true;
    },
  };
});
const { POST } = await import("@/app/api/billing/checkout/route");
const { verifyDeletionBilling } = await import("@/lib/account-deletion");

let next = 0;
function expanded(sub: Sub) {
  const invoice = m.invoices.get(sub.latest_invoice)!;
  return {
    ...sub,
    latest_invoice: { ...invoice, payment_intent: { ...m.payments.get(invoice.payment_intent)! } },
  };
}
function fakeStripe(url: string | URL | Request, init?: RequestInit) {
  const target = new URL(String(url));
  const method = init?.method ?? "GET";
  const key = new Headers(init?.headers).get("Idempotency-Key");
  m.calls.push(`${method} ${target.pathname}`);
  if (m.fail && target.pathname.startsWith(m.fail))
    return Promise.resolve(Response.json({ error: { code: "api_error" } }, { status: 500 }));
  if (key && m.replies.has(key)) return Promise.resolve(Response.json(m.replies.get(key)));
  const reply = (body: unknown, status = 200) => {
    if (key && status === 200) m.replies.set(key, body);
    return Promise.resolve(Response.json(body, { status }));
  };
  const body = new URLSearchParams(String(init?.body ?? ""));
  const path = target.pathname;
  if (method === "POST" && path === "/v1/customers")
    return reply({ id: `cus_${body.get("metadata[outpostUserId]")}` });
  if (method === "GET" && path === "/v1/subscriptions") {
    const customer = target.searchParams.get("customer");
    return reply({ data: m.subscriptions.filter((s) => s.customer === customer), has_more: false });
  }
  if (method === "POST" && path === "/v1/subscriptions") {
    m.created.push(body);
    const n = ++next;
    m.payments.set(`pi_${n}`, {
      id: `pi_${n}`,
      status: "requires_payment_method",
      client_secret: `pi_${n}_secret_${n}`,
    });
    m.invoices.set(`in_${n}`, {
      id: `in_${n}`,
      status: "open",
      customer: body.get("customer")!,
      payment_intent: `pi_${n}`,
    });
    const sub: Sub = {
      id: `sub_${n}`,
      customer: body.get("customer")!,
      status: "incomplete",
      created: n,
      current_period_end: null,
      metadata: {
        outpostUserId: body.get("metadata[outpostUserId]")!,
        outpostCheckoutId: body.get("metadata[outpostCheckoutId]")!,
        outpostConsentAt: body.get("metadata[outpostConsentAt]")!,
      },
      items: { data: [{ price: { id: body.get("items[0][price]")! } }] },
      latest_invoice: `in_${n}`,
    };
    m.subscriptions.push(sub);
    return reply(expanded(sub));
  }
  const sub = m.subscriptions.find((s) => s.id === path.split("/")[3]);
  if (method === "GET" && sub) return reply(expanded(sub));
  if (method === "DELETE" && sub) {
    sub.status = "canceled";
    return reply({ ...sub });
  }
  const invoice = m.invoices.get(path.split("/")[3]);
  if (method === "POST" && invoice && path.endsWith("/void")) {
    const payment = m.payments.get(invoice.payment_intent)!;
    if (invoice.status !== "open" || ["processing", "succeeded"].includes(payment.status))
      return reply({ error: { code: "invoice_not_open" } }, 400);
    invoice.status = "void";
    payment.status = "canceled";
    return reply({ id: invoice.id, status: "void" });
  }
  return reply({ error: { code: "unexpected" } }, 400);
}
const request = (body: unknown = { terms: true }, origin: string | null = "https://outpost.test") =>
  new NextRequest("https://outpost.test/api/billing/checkout?region=europe", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });
const profile = (id: string, extra: Partial<Profile> = {}): Profile => ({
  id,
  name: id,
  email: null,
  plan: "FREE",
  stripeCustomerId: null,
  billingCheckout: null,
  stripeSubscriptionId: null,
  updatedAt: new Date("2026-11-09T00:00:00Z"),
  ...extra,
});
const posts = () => m.calls.filter((call) => call === "POST /v1/subscriptions").length;

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_URL", "https://outpost.test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_supporter");
  vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
  vi.stubGlobal("fetch", vi.fn(fakeStripe));
  m.session = { user: { id: "buyer" } };
  m.onSale = true;
  m.profiles = new Map([
    ["buyer", profile("buyer")],
    ["other", profile("other", { stripeCustomerId: "cus_other" })],
  ]);
  m.subscriptions = [];
  m.invoices = new Map();
  m.payments = new Map();
  m.replies = new Map();
  m.calls = [];
  m.created = [];
  m.fail = null;
  next = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("creates one incomplete subscription and returns only its payment secret", async () => {
  const before = Date.now();
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    clientSecret: "pi_1_secret_1",
    subscriptionId: "sub_1",
  });
  const sent = m.created[0];
  expect(sent.get("customer")).toBe("cus_buyer");
  expect(sent.get("items[0][price]")).toBe("price_supporter");
  expect(sent.get("payment_behavior")).toBe("default_incomplete");
  expect(sent.get("metadata[outpostUserId]")).toBe("buyer");
  const consentAt = Date.parse(sent.get("metadata[outpostConsentAt]")!);
  expect(consentAt).toBeGreaterThanOrEqual(before);
  expect(consentAt).toBeLessThanOrEqual(Date.now());
  expect(m.profiles.get("buyer")!.stripeCustomerId).toBe("cus_buyer");
  expect(m.profiles.get("buyer")!.billingCheckout).toMatchObject({ subscriptionId: "sub_1" });
});

it("reuses the open order instead of creating a second subscription", async () => {
  const first = await (await POST(request())).json();
  const second = await (await POST(request())).json();
  expect(second).toEqual(first);
  expect(posts()).toBe(1);
  expect(m.subscriptions).toHaveLength(1);
});

it("concurrent orders share one operation and one subscription", async () => {
  const replies = await Promise.all([POST(request()), POST(request()), POST(request())]);
  const bodies = await Promise.all(replies.map((r) => r.json()));
  expect(replies.map((r) => r.status)).toEqual([200, 200, 200]);
  expect(new Set(bodies.map((b) => b.clientSecret)).size).toBe(1);
  // Stripe's idempotency key replays the creation: one subscription exists.
  expect(m.subscriptions).toHaveLength(1);
});

it("recovers a subscription created before its id was saved, without creating another", async () => {
  await POST(request());
  delete m.profiles.get("buyer")!.billingCheckout!.subscriptionId;
  m.replies.clear();
  const response = await POST(request());
  expect((await response.json()).subscriptionId).toBe("sub_1");
  expect(posts()).toBe(1);
});

it("starts over after the unpaid order expired", async () => {
  await POST(request());
  m.subscriptions[0].status = "incomplete_expired";
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).subscriptionId).toBe("sub_2");
  expect(posts()).toBe(2);
});

it("refuses an account that already pays or whose payment is being confirmed", async () => {
  m.profiles.get("buyer")!.plan = "SUPPORTER";
  expect((await POST(request())).status).toBe(409);
  expect(m.calls).toEqual([]);
  m.profiles.get("buyer")!.plan = "FREE";
  // Paid, but the webhook has not reached the account yet.
  m.profiles.get("buyer")!.stripeCustomerId = "cus_buyer";
  m.subscriptions.push({
    id: "sub_paid",
    customer: "cus_buyer",
    status: "active",
    created: 1,
    current_period_end: null,
    metadata: {},
    items: { data: [{ price: { id: "price_supporter" } }] },
    latest_invoice: "in_paid",
  });
  expect((await POST(request())).status).toBe(409);
  expect(posts()).toBe(0);
  // The order's own payment is processing.
  m.subscriptions = [];
  await POST(request());
  m.payments.get("pi_1")!.status = "processing";
  const processing = await POST(request());
  expect(processing.status).toBe(409);
  expect((await processing.json()).error).toMatch(/being confirmed/);
});

it.each([
  {},
  { terms: false },
  { terms: "yes" },
  { terms: true, immediateStart: true },
  { terms: true, customerId: "cus_other" },
  { terms: true, priceId: "price_cheap" },
])("an order without exactly the ticked terms box makes no Stripe call: %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(m.calls).toEqual([]);
});

it("refuses signed-out, cross-site and closed sales before any Stripe call", async () => {
  m.session = null;
  expect((await POST(request())).status).toBe(401);
  m.session = { user: { id: "buyer" } };
  expect((await POST(request(undefined, "https://evil.test"))).status).toBe(403);
  expect((await POST(request(undefined, null))).status).toBe(403);
  m.onSale = false;
  expect((await POST(request())).status).toBe(503);
  m.onSale = true;
  vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "");
  expect((await POST(request())).status).toBe(503);
  expect(m.calls).toEqual([]);
});

it("a Stripe failure keeps the operation for a retry that replays it", async () => {
  m.fail = "/v1/subscriptions";
  const failed = await POST(request());
  expect(failed.status).toBe(502);
  expect((await failed.json()).clientSecret).toBeUndefined();
  const key = m.profiles.get("buyer")!.billingCheckout!.key;
  m.fail = null;
  expect((await POST(request())).status).toBe(200);
  expect(m.profiles.get("buyer")!.billingCheckout!.key).toBe(key);
  expect(m.subscriptions).toHaveLength(1);
});

it("never reads or uses another account's customer", async () => {
  await POST(request());
  expect(m.calls.some((call) => call.includes("cus_other"))).toBe(false);
  expect(m.subscriptions.every((s) => s.customer === "cus_buyer")).toBe(true);
});

it("account deletion voids an unpaid order so it can never be paid, and keeps a paying one", async () => {
  await POST(request());
  const clearance = await verifyDeletionBilling("buyer");
  expect(clearance?.customerId).toBe("cus_buyer");
  expect(m.invoices.get("in_1")!.status).toBe("void");
  expect(m.payments.get("pi_1")!.status).toBe("canceled");
  expect(m.subscriptions[0].status).toBe("canceled");
  // A payment already under way is never cancelled: deletion waits.
  m.profiles.set("buyer", profile("buyer"));
  m.replies.clear();
  await POST(request());
  m.payments.get("pi_2")!.status = "processing";
  await expect(verifyDeletionBilling("buyer")).rejects.toMatchObject({ status: 409 });
  expect(m.subscriptions[1].status).toBe("incomplete");
});
