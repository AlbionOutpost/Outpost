import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* The § 356a withdrawal route against a fake Stripe that keeps state and honours idempotency
 * keys: only the signed-in account's own subscriptions inside the 14-day period are ended and
 * refunded, in full and once; denied requests make no Stripe call at all. */
type Sub = Record<string, unknown> & { id: string; customer: string; status: string };
type Charge = {
  id: string;
  customer: string;
  amount: number;
  amount_refunded: number;
  refunded: boolean;
  currency: string;
};
type Invoice = {
  id: string;
  customer: string;
  subscription: string;
  amount_paid: number;
  charge: string | null;
};
const m = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  profiles: new Map<string, { id: string; stripeCustomerId: string | null }>(),
  subscriptions: [] as Sub[],
  invoices: [] as Invoice[],
  charges: new Map<string, Charge>(),
  refunds: [] as { charge: string; amount: number; key: string | null }[],
  replies: new Map<string, unknown>(),
  calls: [] as string[],
  failRefund: false,
}));
vi.mock("next-auth", () => ({ getServerSession: async () => m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/billing/plan", () => ({
  billingProfile: async (id: string) => m.profiles.get(id) ?? null,
}));
const { POST } = await import("@/app/api/billing/withdraw/route");
const { withdrawalDeadline } = await import("@/lib/billing/withdrawal");

const day = 86_400;
const now = () => Math.floor(Date.now() / 1000);
const sub = (id: string, customer: string, extra: Record<string, unknown> = {}): Sub => ({
  id,
  customer,
  status: "active",
  created: now() - 3 * day,
  start_date: now() - 3 * day,
  current_period_end: now() + 27 * day,
  items: { data: [{ price: { id: "price_supporter" } }] },
  ...extra,
});
function paid(subscription: string, customer: string, amount = 299) {
  const charge = `ch_${subscription}`;
  m.charges.set(charge, {
    id: charge,
    customer,
    amount,
    amount_refunded: 0,
    refunded: false,
    currency: "eur",
  });
  m.invoices.push({
    id: `in_${subscription}`,
    customer,
    subscription,
    amount_paid: amount,
    charge,
  });
}

function fakeStripe(url: string | URL | Request, init?: RequestInit) {
  const target = new URL(String(url));
  const method = init?.method ?? "GET";
  const key = new Headers(init?.headers).get("Idempotency-Key");
  m.calls.push(`${method} ${target.pathname}`);
  if (key && m.replies.has(key)) return Promise.resolve(Response.json(m.replies.get(key)));
  const reply = (body: unknown, status = 200) => {
    if (key && status === 200) m.replies.set(key, body);
    return Promise.resolve(Response.json(body, { status }));
  };
  const params = method === "POST" ? new URLSearchParams(String(init?.body)) : target.searchParams;
  if (method === "GET" && target.pathname === "/v1/subscriptions") {
    const customer = params.get("customer");
    return reply({ data: m.subscriptions.filter((s) => s.customer === customer), has_more: false });
  }
  if (method === "DELETE" && target.pathname.startsWith("/v1/subscriptions/")) {
    const found = m.subscriptions.find((s) => s.id === target.pathname.split("/").pop())!;
    if (found.status === "canceled") return reply({ error: { code: "resource_missing" } }, 400);
    found.status = "canceled";
    return reply({ ...found });
  }
  if (method === "GET" && target.pathname === "/v1/invoices") {
    const rows = m.invoices
      .filter(
        (i) =>
          i.customer === params.get("customer") && i.subscription === params.get("subscription"),
      )
      .map((i) => ({
        ...i,
        status: "paid",
        currency: "eur",
        charge: m.charges.get(i.charge!) ?? null,
      }));
    return reply({ data: rows, has_more: false });
  }
  if (method === "POST" && target.pathname === "/v1/refunds") {
    if (m.failRefund) return reply({ error: { code: "api_error" } }, 500);
    const charge = m.charges.get(params.get("charge")!)!;
    if (charge.refunded) return reply({ error: { code: "charge_already_refunded" } }, 400);
    const amount = charge.amount - charge.amount_refunded;
    Object.assign(charge, { amount_refunded: charge.amount, refunded: true });
    m.refunds.push({ charge: charge.id, amount, key });
    return reply({
      id: `re_${charge.id}`,
      status: "succeeded",
      amount,
      currency: "eur",
      charge: charge.id,
    });
  }
  return reply({ error: { code: "unexpected" } }, 400);
}
const request = (
  body: unknown = { confirm: true },
  origin: string | null = "https://outpost.test",
) =>
  new NextRequest("https://outpost.test/api/billing/withdraw", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_URL", "https://outpost.test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_supporter");
  vi.stubGlobal("fetch", vi.fn(fakeStripe));
  m.session = { user: { id: "owner" } };
  m.profiles = new Map([
    ["owner", { id: "owner", stripeCustomerId: "cus_owner" }],
    ["other", { id: "other", stripeCustomerId: "cus_other" }],
    ["free", { id: "free", stripeCustomerId: null }],
  ]);
  m.subscriptions = [sub("sub_owner", "cus_owner"), sub("sub_other", "cus_other")];
  m.invoices = [];
  m.charges = new Map();
  paid("sub_owner", "cus_owner");
  paid("sub_other", "cus_other");
  m.refunds = [];
  m.replies = new Map();
  m.calls = [];
  m.failRefund = false;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("ends the caller's own contract now and refunds every payment in full", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(Date.parse(body.receivedAt)).toBeLessThanOrEqual(Date.now());
  expect(body.contracts).toEqual([
    { startedAt: expect.any(String), refunds: [{ amount: 299, currency: "eur" }] },
  ]);
  expect(m.subscriptions.find((s) => s.id === "sub_owner")!.status).toBe("canceled");
  expect(m.refunds).toEqual([
    { charge: "ch_sub_owner", amount: 299, key: "withdraw-refund-ch_sub_owner" },
  ]);
  // Another customer's contract is never read or touched.
  expect(m.subscriptions.find((s) => s.id === "sub_other")!.status).toBe("active");
  expect(m.calls.some((call) => call.includes("sub_other"))).toBe(false);
  const deletion = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "DELETE")!;
  const query = new URL(String(deletion[0])).searchParams;
  expect(query.get("prorate")).toBe("false");
  expect(query.get("invoice_now")).toBe("false");
});

it("refunds a remainder after a partial refund, never more", async () => {
  m.charges.get("ch_sub_owner")!.amount_refunded = 100;
  expect((await POST(request())).status).toBe(200);
  expect(m.refunds).toEqual([expect.objectContaining({ amount: 199 })]);
});

it("withdraws a contract already cancelled to the period end", async () => {
  m.subscriptions[0].cancel_at_period_end = true;
  expect((await POST(request())).status).toBe(200);
  expect(m.subscriptions[0].status).toBe("canceled");
  expect(m.refunds).toHaveLength(1);
});

it("never refunds twice: a second submission finds nothing left to do", async () => {
  const [first, second] = [await POST(request()), await POST(request())];
  expect(first.status).toBe(200);
  expect(second.status).toBe(409);
  expect(m.refunds).toHaveLength(1);
  expect(m.calls.filter((call) => call.startsWith("DELETE"))).toHaveLength(1);
});

it("a retry after a Stripe failure finishes the job without claiming success first", async () => {
  m.failRefund = true;
  const failed = await POST(request());
  expect(failed.status).toBe(502);
  expect((await failed.json()).error).toMatch(/contact@albionoutpost\.com/);
  expect(m.refunds).toEqual([]);
  // The contract has ended; the retry refunds it without cancelling again.
  m.failRefund = false;
  const retry = await POST(request());
  expect(retry.status).toBe(200);
  expect((await retry.json()).contracts[0].refunds).toEqual([{ amount: 299, currency: "eur" }]);
  expect(m.refunds).toHaveLength(1);
  expect(m.calls.filter((call) => call.startsWith("DELETE"))).toHaveLength(1);
});

it("refuses contracts outside the 14-day period and points to cancellation", async () => {
  m.subscriptions[0] = sub("sub_owner", "cus_owner", {
    created: now() - 20 * day,
    start_date: now() - 20 * day,
  });
  const response = await POST(request());
  expect(response.status).toBe(404);
  expect((await response.json()).error).toMatch(/cancel/);
  expect(m.calls).toEqual(["GET /v1/subscriptions"]);
  expect(m.refunds).toEqual([]);
});

it("uses Stripe's start time, not a later creation time", async () => {
  m.subscriptions[0] = sub("sub_owner", "cus_owner", {
    created: now() - 2 * day,
    start_date: now() - 16 * day,
  });
  expect((await POST(request())).status).toBe(404);
  expect(m.refunds).toEqual([]);
});

it("ignores other prices", async () => {
  m.subscriptions[0].items = { data: [{ price: { id: "price_other" } }] };
  expect((await POST(request())).status).toBe(404);
  expect(m.refunds).toEqual([]);
});

it("never touches another account's subscription, whatever the body names", async () => {
  for (const body of [
    { confirm: true, subscriptionId: "sub_other" },
    { confirm: true, customerId: "cus_other" },
    { confirm: false },
    {},
  ])
    expect((await POST(request(body))).status).toBe(400);
  expect(m.calls).toEqual([]);
  m.session = { user: { id: "free" } };
  expect((await POST(request())).status).toBe(404);
  expect(m.calls).toEqual([]);
  expect(m.subscriptions.every((s) => s.status === "active")).toBe(true);
});

it("fails closed when Stripe returns an invoice of another customer", async () => {
  // The fake filters by customer, so forge the reply.
  vi.mocked(fetch).mockImplementation((url, init) => {
    const target = new URL(String(url));
    if (target.pathname === "/v1/invoices")
      return Promise.resolve(
        Response.json({
          data: [{ ...m.invoices[1], customer: "cus_other", subscription: "sub_owner" }],
          has_more: false,
        }),
      );
    return fakeStripe(url, init);
  });
  expect((await POST(request())).status).toBe(502);
  expect(m.refunds).toEqual([]);
});

it("refuses signed-out callers and cross-site requests before reading Stripe", async () => {
  m.session = null;
  expect((await POST(request())).status).toBe(401);
  m.session = { user: { id: "owner" } };
  expect((await POST(request(undefined, "https://evil.test"))).status).toBe(403);
  expect((await POST(request(undefined, null))).status).toBe(403);
  expect(vi.mocked(fetch)).not.toHaveBeenCalled();
});

it("is unavailable while billing is not configured", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  expect((await POST(request())).status).toBe(503);
  expect(vi.mocked(fetch)).not.toHaveBeenCalled();
});

describe("the withdrawal deadline", () => {
  const berlin = (ms: number) =>
    new Date(ms).toLocaleString("en-GB", { timeZone: "Europe/Berlin", hourCycle: "h23" });
  it("runs to the end of the 14th day after the order, German time", () => {
    // Ordered 1 March 2027, 23:30 CET: the period ends at midnight after 15 March.
    const start = Date.UTC(2027, 2, 1, 22, 30) / 1000;
    expect(berlin(withdrawalDeadline(start))).toBe("15/03/2027, 23:59:59");
  });
  it("follows summer time", () => {
    // Ordered 20 March 2027 (CET); the period ends 3 April (CEST).
    const start = Date.UTC(2027, 2, 20, 9) / 1000;
    expect(berlin(withdrawalDeadline(start))).toBe("03/04/2027, 23:59:59");
    expect(withdrawalDeadline(start) + 1).toBe(Date.UTC(2027, 3, 3, 22));
  });
});
