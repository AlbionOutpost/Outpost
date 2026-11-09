import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* The § 312k cancellation route against a fake Stripe: only the signed-in account's own
 * customer is ever read or changed, and denied requests make no Stripe call at all. */
const m = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  profiles: new Map<string, { id: string; stripeCustomerId: string | null }>(),
  subscriptions: new Map<string, Record<string, unknown>[]>(),
  posts: [] as { path: string; body: URLSearchParams }[],
  gets: [] as string[],
  foreignCustomerOnPost: false,
}));
vi.mock("next-auth", () => ({ getServerSession: async () => m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/billing/plan", () => ({
  billingProfile: async (id: string) => m.profiles.get(id) ?? null,
}));
const { POST } = await import("@/app/api/billing/cancel/route");

const end = 1_800_000_000;
const sub = (id: string, customer: string, extra: Record<string, unknown> = {}) => ({
  id,
  customer,
  status: "active",
  created: 1,
  current_period_end: end,
  cancel_at_period_end: false,
  items: { data: [{ price: { id: "price_supporter" } }] },
  ...extra,
});
function fakeStripe(url: string | URL, init?: RequestInit) {
  const target = new URL(String(url));
  if (init?.method === "POST") {
    const body = new URLSearchParams(String(init.body));
    m.posts.push({ path: target.pathname, body });
    const id = decodeURIComponent(target.pathname.split("/").pop()!);
    const found = [...m.subscriptions.values()].flat().find((s) => s.id === id)!;
    return Promise.resolve(
      Response.json({
        ...found,
        customer: m.foreignCustomerOnPost ? "cus_someone_else" : found.customer,
        cancel_at_period_end: body.get("cancel_at_period_end") === "true",
      }),
    );
  }
  const customer = target.searchParams.get("customer")!;
  m.gets.push(customer);
  return Promise.resolve(
    Response.json({ data: m.subscriptions.get(customer) ?? [], has_more: false }),
  );
}
const request = (body: unknown, origin: string | null = "https://outpost.test") =>
  new NextRequest("https://outpost.test/api/billing/cancel", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_URL", "https://outpost.test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_supporter");
  vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
  vi.stubGlobal("fetch", vi.fn(fakeStripe));
  m.session = { user: { id: "owner" } };
  m.profiles = new Map([
    ["owner", { id: "owner", stripeCustomerId: "cus_owner" }],
    ["other", { id: "other", stripeCustomerId: "cus_other" }],
    ["free", { id: "free", stripeCustomerId: null }],
  ]);
  m.subscriptions = new Map([
    ["cus_owner", [sub("sub_owner", "cus_owner")]],
    ["cus_other", [sub("sub_old", "cus_other", { status: "canceled" })]],
  ]);
  m.posts = [];
  m.gets = [];
  m.foreignCustomerOnPost = false;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("cancels the caller's own subscription at the period end and says when it ends", async () => {
  const response = await POST(request({ kind: "ordinary" }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body.endsAt).toBe(new Date(end * 1000).toISOString());
  expect(Date.parse(body.receivedAt)).toBeLessThanOrEqual(Date.now());
  expect(m.gets).toEqual(["cus_owner"]);
  expect(m.posts).toHaveLength(1);
  expect(m.posts[0].path).toBe("/v1/subscriptions/sub_owner");
  expect(m.posts[0].body.get("cancel_at_period_end")).toBe("true");
  expect(m.posts[0].body.get("metadata[outpostCancelKind]")).toBe("ordinary");
  expect(m.posts[0].body.get("cancellation_details[comment]")).toBeNull();
});

it("an extraordinary cancellation needs a reason and passes it on", async () => {
  expect((await POST(request({ kind: "extraordinary" }))).status).toBe(400);
  expect((await POST(request({ kind: "extraordinary", reason: " " }))).status).toBe(400);
  expect(m.gets).toEqual([]);
  const response = await POST(request({ kind: "extraordinary", reason: "Moved away" }));
  expect(response.status).toBe(200);
  expect(m.posts[0].body.get("cancellation_details[comment]")).toBe("Moved away");
  expect(m.posts[0].body.get("metadata[outpostCancelKind]")).toBe("extraordinary");
});

it("never touches another account's subscription", async () => {
  // A named subscription or customer is not accepted at all.
  for (const body of [
    { kind: "ordinary", subscriptionId: "sub_owner" },
    { kind: "ordinary", customerId: "cus_owner" },
  ]) {
    m.session = { user: { id: "other" } };
    expect((await POST(request(body))).status).toBe(400);
  }
  expect(m.gets).toEqual([]);
  // Signed in as another account: only that account's (ended) history is read; nothing changes.
  const response = await POST(request({ kind: "ordinary" }));
  expect(response.status).toBe(404);
  expect(m.gets).toEqual(["cus_other"]);
  expect(m.posts).toEqual([]);
});

it("refuses signed-out callers and cross-site requests before reading Stripe", async () => {
  m.session = null;
  expect((await POST(request({ kind: "ordinary" }))).status).toBe(401);
  m.session = { user: { id: "owner" } };
  expect((await POST(request({ kind: "ordinary" }, "https://evil.test"))).status).toBe(403);
  expect((await POST(request({ kind: "ordinary" }, null))).status).toBe(403);
  expect(vi.mocked(fetch)).not.toHaveBeenCalled();
});

it("answers 404 without a billing record or a live Supporter subscription", async () => {
  m.session = { user: { id: "free" } };
  expect((await POST(request({ kind: "ordinary" }))).status).toBe(404);
  expect(m.gets).toEqual([]);
  m.session = { user: { id: "owner" } };
  m.subscriptions.set("cus_owner", [
    sub("sub_owner", "cus_owner", { items: { data: [{ price: { id: "price_other" } }] } }),
  ]);
  expect((await POST(request({ kind: "ordinary" }))).status).toBe(404);
  expect(m.posts).toEqual([]);
});

it("cancels the paid plan and leaves an unpaid order from the payment form alone", async () => {
  m.subscriptions.set("cus_owner", [
    sub("sub_owner", "cus_owner"),
    sub("sub_unpaid", "cus_owner", { status: "incomplete", current_period_end: end + 99 }),
  ]);
  const response = await POST(request({ kind: "ordinary" }));
  expect(response.status).toBe(200);
  expect((await response.json()).endsAt).toBe(new Date(end * 1000).toISOString());
  expect(m.posts.map((post) => post.path)).toEqual(["/v1/subscriptions/sub_owner"]);
  m.posts = [];
  m.subscriptions.set("cus_owner", [sub("sub_unpaid", "cus_owner", { status: "incomplete" })]);
  expect((await POST(request({ kind: "ordinary" }))).status).toBe(404);
  expect(m.posts).toEqual([]);
});

it("does not repeat a cancellation that is already scheduled", async () => {
  m.subscriptions.set("cus_owner", [sub("sub_owner", "cus_owner", { cancel_at_period_end: true })]);
  const response = await POST(request({ kind: "ordinary" }));
  expect(response.status).toBe(200);
  expect((await response.json()).endsAt).toBe(new Date(end * 1000).toISOString());
  expect(m.posts).toEqual([]);
});

it("fails closed when Stripe answers for another customer", async () => {
  m.foreignCustomerOnPost = true;
  expect((await POST(request({ kind: "ordinary" }))).status).toBe(502);
});

it("is unavailable while billing is not configured", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  expect((await POST(request({ kind: "ordinary" }))).status).toBe(503);
  expect(vi.mocked(fetch)).not.toHaveBeenCalled();
});
