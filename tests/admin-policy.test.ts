import { describe, it, expect } from "vitest";
import { accountBanned, giftedSupporter } from "../src/lib/admin/policy";
import { isSupporter } from "../src/lib/billing/plan";
import { userAction, banAction, adminQuery } from "../src/lib/admin/validation";
const now = Date.parse("2026-11-05T00:00:00Z");
describe("time-bounded account access", () => {
  it("bans permanent accounts and future expiries, allowing exact-expiry and revoked users", () => {
    expect(accountBanned({ bannedAt: new Date(now) }, now)).toBe(true);
    expect(accountBanned({ bannedAt: new Date(now), bannedUntil: new Date(now + 1) }, now)).toBe(
      true,
    );
    expect(accountBanned({ bannedAt: new Date(now), bannedUntil: new Date(now) }, now)).toBe(false);
    expect(accountBanned({ bannedAt: null, bannedUntil: new Date(now + 1) }, now)).toBe(false);
  });
  it("expires gifts at their exact boundary without cancelling a subscription", () => {
    expect(giftedSupporter({ supporterGiftUntil: new Date(now + 1) }, now)).toBe(true);
    expect(giftedSupporter({ supporterGiftUntil: new Date(now) }, now)).toBe(false);
    expect(giftedSupporter({ supporterGiftPermanent: true }, now)).toBe(true);
    expect(
      isSupporter({
        plan: "SUPPORTER",
        supporterGiftPermanent: false,
        supporterGiftUntil: new Date(0),
      }),
    ).toBe(true);
  });
  it("rejects injected role/payment fields and stale-free mutation bodies", () => {
    const v = {
      action: "grant",
      days: 30,
      reason: "Owner gift",
      expectedUpdatedAt: new Date(now).toISOString(),
    };
    expect(userAction.safeParse(v).success).toBe(true);
    for (const injected of [{ role: "ADMIN" }, { plan: "SUPPORTER" }, { stripeCustomerId: "fake" }])
      expect(userAction.safeParse({ ...v, ...injected }).success).toBe(false);
    expect(userAction.safeParse({ ...v, expectedUpdatedAt: undefined }).success).toBe(false);
  });
  it("requires exact Discord confirmation and a supported duration", () => {
    const v = {
      discordId: "123456789012345678",
      action: "ban",
      days: 7,
      reason: "Abuse review confirmed",
      version: 0,
      confirmation: "BAN 123456789012345678",
    };
    expect(banAction.safeParse(v).success).toBe(true);
    for (const change of [
      { confirmation: "BAN someone" },
      { days: -1 },
      { days: 99999 },
      { discordId: "name#1234" },
      { version: -1 },
      { role: "ADMIN" },
    ])
      expect(banAction.safeParse({ ...v, ...change }).success).toBe(false);
  });
  it("bounds searches and pagination", () => {
    expect(adminQuery.safeParse({ q: "a".repeat(81) }).success).toBe(false);
    expect(adminQuery.safeParse({ page: 1001 }).success).toBe(false);
    expect(adminQuery.parse({})).toEqual({ q: "", page: 1, filter: "all" });
  });
});
