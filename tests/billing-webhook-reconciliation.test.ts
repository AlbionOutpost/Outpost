import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError } from "@/lib/http-error";
const mocks = vi.hoisted(() => ({ find: vi.fn(), apply: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.find } } }));
vi.mock("@/lib/billing/plan", () => ({
  applySubscription: mocks.apply,
  planForStatus: (status: string) =>
    ["active", "trialing", "past_due"].includes(status) ? "SUPPORTER" : "FREE",
}));
import { POST } from "@/app/api/billing/webhook/route";
const revision = new Date("2026-11-02T00:00:00Z");
const subscription = (id: string, status: string, price = "price_expected") => ({
  id,
  customer: "cus_owned",
  status,
  created: id === "sub_old" ? 1 : 2,
  current_period_end: null,
  metadata: { outpostUserId: "untrusted-other-user" },
  items: { data: [{ price: { id: price } }] },
});
const response = (data: unknown) => new Response(JSON.stringify(data));
const request = (
  signatureValid = true,
  type = "customer.subscription.deleted",
  object: Record<string, unknown> = { id: "sub_old" },
) => {
  const body = JSON.stringify({ id: "evt_fixture", type, data: { object } });
  const time = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", signatureValid ? "fixture-secret" : "invalid")
    .update(`${time}.${body}`)
    .digest("hex");
  return new NextRequest("https://outpost.test/api/billing/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": `t=${time},v1=${signature}` },
  });
};
beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "fixture-secret");
  vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_expected");
  vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
  mocks.find.mockReset().mockResolvedValue({ updatedAt: revision });
  mocks.apply.mockReset().mockResolvedValue("matched-user");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("a signed old-subscription cancellation reconciles the active replacement for the persisted customer", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(subscription("sub_old", "canceled")))
      .mockResolvedValueOnce(
        response({
          data: [subscription("sub_old", "canceled"), subscription("sub_new", "active")],
          has_more: false,
        }),
      ),
  );
  expect((await POST(request())).status).toBe(200);
  expect(mocks.find).toHaveBeenCalledWith({
    where: { stripeCustomerId: "cus_owned" },
    select: { updatedAt: true },
  });
  expect(mocks.apply).toHaveBeenCalledWith({
    customerId: "cus_owned",
    subscriptionId: "sub_new",
    status: "active",
    periodEnd: null,
    expectedUpdatedAt: revision.toISOString(),
  });
});
it.each([
  ["customer.subscription.created", "incomplete", "FREE until paid"],
  ["customer.subscription.updated", "active", "Supporter once the first invoice is paid"],
])("an on-site order reconciles from %s (%s: %s)", async (type, status) => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response(subscription("sub_new", status)))
    .mockResolvedValueOnce(response({ data: [subscription("sub_new", status)], has_more: false }));
  vi.stubGlobal("fetch", fetcher);
  expect((await POST(request(true, type, { id: "sub_new", status: "forged" }))).status).toBe(200);
  // The event body is never trusted: the status comes from Stripe's own record.
  expect(mocks.apply).toHaveBeenCalledWith(
    expect.objectContaining({ subscriptionId: "sub_new", status }),
  );
});
it("ignores events that are not subscription changes, Checkout included", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  for (const [type, object] of [
    ["checkout.session.completed", { mode: "subscription", subscription: "sub_new" }],
    ["invoice.payment_failed", { id: "in_1", subscription: "sub_new" }],
  ] as const) {
    const res = await POST(request(true, type, object));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(type);
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect(mocks.apply).not.toHaveBeenCalled();
});
it("a different configured price never grants Supporter access", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(subscription("sub_old", "active", "price_other")))
      .mockResolvedValueOnce(
        response({ data: [subscription("sub_old", "active", "price_other")], has_more: false }),
      ),
  );
  expect((await POST(request())).status).toBe(200);
  expect(mocks.apply).toHaveBeenCalledWith(
    expect.objectContaining({ subscriptionId: null, status: "none" }),
  );
});
it("bad signatures and unavailable authoritative histories make no entitlement writes", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response(subscription("sub_old", "canceled")))
    .mockRejectedValueOnce(Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  expect((await POST(request(false))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
  expect((await POST(request())).status).toBe(503);
  expect(mocks.apply).not.toHaveBeenCalled();
});
it("a stale local snapshot returns a retryable failure rather than acknowledging a dropped update", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(subscription("sub_old", "canceled")))
      .mockResolvedValueOnce(response({ data: [], has_more: false })),
  );
  mocks.apply.mockRejectedValueOnce(new HttpError(409, "Billing changed"));
  expect((await POST(request())).status).toBe(409);
});

it("cancels an oversized chunked webhook before signature parsing or provider requests", async () => {
  let chunks = 0,
    cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunks === 10) return controller.close();
      chunks++;
      controller.enqueue(new Uint8Array(65536).fill(65));
    },
    cancel() {
      cancelled = true;
    },
  });
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const req = new NextRequest("https://outpost.test/api/billing/webhook", {
    method: "POST",
    body: stream,
  });
  expect((await POST(req)).status).toBe(413);
  expect(cancelled).toBe(true);
  expect(chunks).toBeLessThan(10);
  expect(fetcher).not.toHaveBeenCalled();
  expect(mocks.apply).not.toHaveBeenCalled();
});
