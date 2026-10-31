import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhook } from "@/lib/billing/stripe";
import { planForStatus } from "@/lib/billing/plan";
import { teamManagementActions } from "@/lib/billing/gate";

const secret = "whsec_test_secret";
const payload = JSON.stringify({
  id: "evt_1",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", status: "active" } },
});
const sign = (ts: number, body = payload, key = secret) =>
  `t=${ts},v1=${createHmac("sha256", key).update(`${ts}.${body}`).digest("hex")}`;

describe("Stripe webhook verification", () => {
  const now = 1_800_000_000_000;
  it("accepts a fresh, correctly signed event", async () => {
    const event = await verifyWebhook(payload, sign(now / 1000), secret, now);
    expect(event.type).toBe("customer.subscription.updated");
    expect(event.data.object.id).toBe("sub_1");
  });
  it("rejects a missing, malformed, wrong-key, tampered or stale signature", async () => {
    await expect(verifyWebhook(payload, null, secret, now)).rejects.toThrow(/Missing/);
    await expect(verifyWebhook(payload, "nonsense", secret, now)).rejects.toThrow(/Malformed/);
    await expect(
      verifyWebhook(payload, sign(now / 1000, payload, "other"), secret, now),
    ).rejects.toThrow(/Invalid/);
    await expect(verifyWebhook(payload + " ", sign(now / 1000), secret, now)).rejects.toThrow(
      /Invalid/,
    );
    await expect(verifyWebhook(payload, sign(now / 1000 - 600), secret, now)).rejects.toThrow(
      /tolerance/,
    );
  });
  it("rejects a signed body that is not an event", async () => {
    const body = JSON.stringify({ hello: "world" });
    await expect(verifyWebhook(body, sign(now / 1000, body), secret, now)).rejects.toThrow(
      /Malformed event/,
    );
  });
});

describe("plan mapping", () => {
  it("keeps the plan on while Stripe still considers the subscription live", () => {
    for (const s of ["active", "trialing", "past_due"]) expect(planForStatus(s)).toBe("SUPPORTER");
    for (const s of [
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
      null,
      undefined,
    ])
      expect(planForStatus(s)).toBe("FREE");
  });
  it("gates management, never participation", () => {
    for (const a of ["profile", "event", "invite", "share-build", "delete"])
      expect(teamManagementActions.has(a)).toBe(true);
    for (const a of ["request", "rsvp", "leave"]) expect(teamManagementActions.has(a)).toBe(false);
  });
});

describe("advertising configuration", () => {
  const original = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = original;
  });
  it("serves the seller line only for a valid publisher id", async () => {
    const { GET } = await import("@/app/ads.txt/route");
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-3003146014371070";
    expect(await GET().text()).toBe("google.com, pub-3003146014371070, DIRECT, f08c47fec0942fa0\n");
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "pub-abc";
    expect(await GET().text()).toMatch(/^# No advertising/);
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    expect(await GET().text()).toMatch(/^# No advertising/);
  });
});
