import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { selectSupporterSubscription } from "@/lib/billing/reconciliation";
import { resolveCheckout, type CheckoutIntent } from "@/lib/billing/checkout";
import { listSubscriptions, type StripeSubscription } from "@/lib/billing/stripe";

const config = { secretKey: "test", webhookSecret: "test", priceId: "price_supporter" };
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
  successUrl: "https://outpost.test/supporter?success=1",
  cancelUrl: "https://outpost.test/supporter",
};
const session = (status = "open") => ({
  id: "cs_test",
  customer: intent.customerId,
  mode: "subscription",
  status,
  url: "https://checkout.stripe.com/test",
  metadata: { outpostCheckoutId: intent.key },
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
it("recovers a persisted intent using the exact original price, URLs and idempotency key", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(reply({ data: [], has_more: false }))
    .mockResolvedValueOnce(reply(session()));
  vi.stubGlobal("fetch", fetcher);
  expect((await resolveCheckout(config, intent)).id).toBe("cs_test");
  const [, request] = fetcher.mock.calls[1];
  expect(request.headers["Idempotency-Key"]).toBe(`checkout-${intent.key}`);
  expect(request.body.get("line_items[0][price]")).toBe("price_original");
  expect(request.body.get("success_url")).toBe(intent.successUrl);
  expect(request.body.get("metadata[outpostCheckoutId]")).toBe(intent.key);
});
it.each(["open", "complete", "expired"])(
  "recovers a %s session created before the local response was saved without creating another",
  async (status) => {
    const fetcher = vi.fn().mockResolvedValue(reply({ data: [session(status)], has_more: false }));
    vi.stubGlobal("fetch", fetcher);
    expect((await resolveCheckout(config, intent)).status).toBe(status);
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("does not create a checkout when provider history is unavailable or belongs to another customer", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(reply({ data: [{ ...session(), customer: "cus_other" }], has_more: false }));
  vi.stubGlobal("fetch", fetcher);
  await expect(resolveCheckout(config, intent)).rejects.toThrow(/Invalid billing/);
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
