import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { selectSupporterSubscription } from "@/lib/billing/reconciliation";
import { resolveOrder, type CheckoutIntent } from "@/lib/billing/checkout";
import { listSubscriptions, type StripeSubscription } from "@/lib/billing/stripe";

const config = {
  secretKey: "test",
  webhookSecret: "test",
  priceId: "price_supporter",
  publishableKey: "pk_test",
};
const sub = (
  id: string,
  status: string,
  created: number,
  price = config.priceId,
): StripeSubscription => ({
  id,
  customer: "cus_test",
  status,
  created,
  current_period_end: null,
  items: { data: [{ price: { id: price } }] },
});
const intent: CheckoutIntent = {
  key: randomUUID(),
  customerId: "cus_test",
  userId: "user",
  priceId: "price_original",
  consentAt: "2026-11-20T10:00:00.000Z",
};
const order = (status = "incomplete", extra: Partial<StripeSubscription> = {}) => ({
  ...sub("sub_order", status, 5, intent.priceId),
  metadata: { outpostCheckoutId: intent.key },
  ...extra,
});
const reply = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
afterEach(() => vi.unstubAllGlobals());

it("keeps the active replacement when an old cancellation triggers reconciliation", () => {
  const current = sub("sub_new", "active", 20);
  expect(
    selectSupporterSubscription([sub("sub_old", "canceled", 10), current], config.priceId),
  ).toBe(current);
  expect(
    selectSupporterSubscription(
      [current, sub("sub_failed_newer", "incomplete_expired", 30)],
      config.priceId,
    ),
  ).toBe(current);
  expect(
    selectSupporterSubscription(
      [sub("sub_old", "canceled", 10), sub("sub_new", "canceled", 20)],
      config.priceId,
    )?.id,
  ).toBe("sub_new");
});
it("does not grant entitlement for a different price and fails closed on incomplete provider state", () => {
  expect(
    selectSupporterSubscription([sub("sub_other", "active", 10, "price_other")], config.priceId),
  ).toBeNull();
  expect(() =>
    selectSupporterSubscription([{ ...sub("sub", "active", 1), items: undefined }], config.priceId),
  ).toThrow(/Incomplete/);
});
it("creates the order's subscription with the exact original price, consent and idempotency key", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(reply({ data: [], has_more: false }))
    .mockResolvedValueOnce(reply(order()));
  vi.stubGlobal("fetch", fetcher);
  expect((await resolveOrder(config, intent)).id).toBe("sub_order");
  const [url, request] = fetcher.mock.calls[1];
  expect(url).toBe("https://api.stripe.com/v1/subscriptions");
  expect(request.headers["Idempotency-Key"]).toBe(`subscription-${intent.key}`);
  const body: URLSearchParams = request.body;
  expect(body.get("customer")).toBe("cus_test");
  expect(body.get("items[0][price]")).toBe("price_original");
  expect(body.get("payment_behavior")).toBe("default_incomplete");
  expect(body.get("payment_settings[save_default_payment_method]")).toBe("on_subscription");
  expect(body.get("expand[0]")).toBe("latest_invoice.payment_intent");
  expect(body.get("metadata[outpostCheckoutId]")).toBe(intent.key);
  expect(body.get("metadata[outpostConsentAt]")).toBe(intent.consentAt);
  // The dashboard's payment method settings decide card, Apple Pay, Google Pay and Link.
  expect([...body.keys()].some((key) => key.includes("payment_method_types"))).toBe(false);
});
it.each(["incomplete", "active", "incomplete_expired"])(
  "recovers a %s subscription created before the local response was saved without creating another",
  async (status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply({ data: [order(status)], has_more: false }))
      .mockResolvedValueOnce(reply(order(status)));
    vi.stubGlobal("fetch", fetcher);
    expect((await resolveOrder(config, intent)).status).toBe(status);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toContain("/v1/subscriptions/sub_order?");
    expect(fetcher.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true);
  },
);
it("reads a saved subscription by id and rejects one of another customer, key or price", async () => {
  for (const forged of [
    order("incomplete", { customer: "cus_other" }),
    order("incomplete", { metadata: { outpostCheckoutId: "other" } }),
    order("incomplete", { items: { data: [{ price: { id: "price_other" } }] } }),
  ]) {
    const fetcher = vi.fn().mockResolvedValue(reply(forged));
    vi.stubGlobal("fetch", fetcher);
    await expect(resolveOrder(config, { ...intent, subscriptionId: "sub_order" })).rejects.toThrow(
      /Unexpected billing order/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});
it("does not create a subscription when provider history is unavailable, foreign or duplicated", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(reply({ data: [{ ...order(), customer: "cus_other" }], has_more: false }));
  vi.stubGlobal("fetch", fetcher);
  await expect(resolveOrder(config, intent)).rejects.toThrow(/Invalid billing/);
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockReset().mockResolvedValue(reply({ data: [order(), order()], has_more: false }));
  await expect(resolveOrder(config, intent)).rejects.toThrow(/Duplicate/);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("reads all subscription pages and rejects truncated histories instead of dropping entitlements", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(reply({ data: [sub("old", "canceled", 1)], has_more: true }))
    .mockResolvedValueOnce(reply({ data: [sub("current", "active", 2)], has_more: false }));
  vi.stubGlobal("fetch", fetcher);
  expect((await listSubscriptions(config, "cus_test")).map((s) => s.id)).toEqual([
    "old",
    "current",
  ]);
  expect(fetcher.mock.calls[1][0]).toContain("starting_after=old");
  fetcher
    .mockReset()
    .mockImplementation(async () =>
      reply({ data: [sub(randomUUID(), "active", 2)], has_more: true }),
    );
  await expect(listSubscriptions(config, "cus_test")).rejects.toThrow(
    /history requires reconciliation/,
  );
  expect(fetcher).toHaveBeenCalledTimes(10);
});
