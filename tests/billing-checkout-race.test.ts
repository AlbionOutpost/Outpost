import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  begin: vi.fn(),
  update: vi.fn(),
  resolve: vi.fn(),
  list: vi.fn(),
  onSale: { value: true },
}));
vi.mock("@/lib/http", () => ({
  mutationUser: async () => ({ userId: "owner" }),
  boundedJson: async (req: Request) => req.json(),
}));
vi.mock("@/lib/billing/plan", () => ({
  billingProfile: mocks.profile,
  rememberCustomer: vi.fn(),
  salesOpen: () => mocks.onSale.value,
  planForStatus: (status: string) =>
    ["active", "trialing", "past_due"].includes(status) ? "SUPPORTER" : "FREE",
}));
vi.mock("@/lib/billing/checkout", () => ({
  beginCheckout: mocks.begin,
  updateCheckout: mocks.update,
  resolveCheckout: mocks.resolve,
}));
vi.mock("@/lib/billing/stripe", () => ({
  stripeConfig: () => ({ priceId: "price_fixture" }),
  createCustomer: vi.fn(),
  listSubscriptions: mocks.list,
}));
import { POST } from "@/app/api/billing/checkout/route";
const intent = { key: "operation", customerId: "cus_owner", userId: "owner" };
const open = {
  id: "cs_old",
  mode: "subscription",
  status: "open",
  customer: "cus_owner",
  url: "https://checkout.stripe.com/fixture",
};
const complete = { ...open, status: "complete", subscription: "sub_old", url: null };
const subscription = (status: string) => ({ id: "sub_old", customer: "cus_owner", status });
const consent = { terms: true, immediateStart: true };
const request = (body: unknown = consent) =>
  new NextRequest("https://outpost.test/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.onSale.value = true;
  mocks.profile.mockResolvedValue({
    id: "owner",
    plan: "FREE",
    stripeCustomerId: "cus_owner",
    billingCheckout: intent,
  });
  mocks.begin.mockResolvedValue(intent);
  mocks.list.mockResolvedValue([]);
  mocks.resolve.mockResolvedValue(open);
  mocks.update.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());
it("overlapping completed-intent retries cannot create another checkout before a delayed webhook", async () => {
  const reached = deferred<void>(),
    release = deferred<void>();
  mocks.begin.mockImplementationOnce(async () => {
    reached.resolve();
    await release.promise;
    return intent;
  });
  mocks.list.mockResolvedValue([subscription("active")]);
  mocks.resolve.mockResolvedValue(complete);
  const first = POST(request());
  await reached.promise;
  expect((await POST(request())).status).toBe(409);
  release.resolve();
  expect((await first).status).toBe(409);
  expect(mocks.list).toHaveBeenCalledTimes(2);
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("every concurrent reuser must finish its own provider check before resolving", async () => {
  const reached = deferred<void>(),
    release = deferred<unknown[]>();
  mocks.list.mockImplementationOnce(() => {
    reached.resolve();
    return release.promise;
  });
  const first = POST(request());
  await reached.promise;
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect((await POST(request())).status).toBe(200);
  expect(mocks.resolve).toHaveBeenCalledTimes(1);
  release.resolve([]);
  expect((await first).status).toBe(200);
  expect(mocks.list).toHaveBeenCalledTimes(2);
  expect(mocks.resolve).toHaveBeenCalledTimes(2);
  expect(mocks.resolve.mock.calls.every((call) => call[1].key === intent.key)).toBe(true);
});
it("no intent plus active subscription remains denied", async () => {
  mocks.profile.mockResolvedValue({
    id: "owner",
    plan: "FREE",
    stripeCustomerId: "cus_owner",
    billingCheckout: null,
  });
  mocks.list.mockResolvedValue([subscription("active")]);
  expect((await POST(request())).status).toBe(409);
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("provider failure preserves the operation and creates no session", async () => {
  mocks.list.mockRejectedValue(new Error("provider offline"));
  expect((await POST(request())).status).toBe(503);
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each([
  { history: [] },
  { history: [subscription("active")] },
  { history: [{ ...subscription("canceled"), id: "sub_other" }] },
])("completion requires its exact terminal subscription: %j", async ({ history }) => {
  mocks.list.mockResolvedValueOnce([]).mockResolvedValueOnce(history);
  mocks.resolve.mockResolvedValue(complete);
  expect((await POST(request())).status).toBe(409);
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.list).toHaveBeenCalledTimes(2);
});
it("missing subscription identity cannot retire completed checkout", async () => {
  mocks.resolve.mockResolvedValue({ ...complete, subscription: null });
  expect((await POST(request())).status).toBe(409);
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each(["canceled", "incomplete_expired"])(
  "verified %s retires the exact completed operation",
  async (status) => {
    mocks.list.mockResolvedValue([subscription(status)]);
    mocks.resolve.mockResolvedValue(complete);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.update).toHaveBeenCalledWith("owner", intent.key, null);
  },
);
it("expired checkout without live subscriptions can retire", async () => {
  mocks.resolve.mockResolvedValue({ ...open, status: "expired" });
  expect((await POST(request())).status).toBe(409);
  expect(mocks.update).toHaveBeenCalledWith("owner", intent.key, null);
});

it.each([
  {},
  { terms: true },
  { immediateStart: true },
  { terms: true, immediateStart: false },
  { terms: "yes", immediateStart: true },
  { ...consent, extra: 1 },
])("an order without both ticked boxes is refused before any billing work: %j", async (body) => {
  const response = await POST(request(body));
  expect(response.status).toBe(400);
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.begin).not.toHaveBeenCalled();
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("records when the boxes were ticked on the checkout operation", async () => {
  const before = Date.now();
  expect((await POST(request())).status).toBe(200);
  const consentAt = mocks.begin.mock.calls[0][1].consentAt;
  expect(Date.parse(consentAt)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(consentAt)).toBeLessThanOrEqual(Date.now());
});
it("sells nothing while the plan is not on sale (launch open or terms unpublished)", async () => {
  mocks.onSale.value = false;
  expect((await POST(request())).status).toBe(503);
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.begin).not.toHaveBeenCalled();
});
