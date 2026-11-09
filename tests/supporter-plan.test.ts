import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const legal = vi.hoisted(() => ({ published: true }));
vi.mock("@/lib/legal", () => ({
  get legalPublished() {
    return legal.published;
  },
}));
vi.mock("@/lib/db", () => ({ db: {}, databaseService: () => undefined }));
vi.mock("server-only", () => ({}));
import {
  launchGrant,
  publicSupporter,
  salesOpen,
  showsBadge,
  storedSupporter,
} from "@/lib/billing/plan";

const late = new Date("2026-12-01T00:00:00Z");
describe("the public Supporter badge", () => {
  afterEach(() => {
    launchGrant.closedAt = null;
  });
  it("marks a stored plan or a live gift, never the launch grant", () => {
    expect(storedSupporter({ plan: "SUPPORTER" })).toBe(true);
    expect(storedSupporter({ plan: "FREE", supporterGiftPermanent: true })).toBe(true);
    expect(
      storedSupporter({ plan: "FREE", supporterGiftUntil: new Date(Date.now() + 60000) }),
    ).toBe(true);
    expect(storedSupporter({ plan: "FREE", supporterGiftUntil: new Date(Date.now() - 1) })).toBe(
      false,
    );
    // While the launch is open every account holds the grant; none of them gets the badge.
    expect(storedSupporter({ plan: "FREE", createdAt: late })).toBe(false);
    launchGrant.closedAt = new Date("2027-01-01T00:00:00Z");
    expect(storedSupporter({ plan: "FREE", createdAt: late })).toBe(false);
  });
  it("hands on only the flag, never the plan, gift dates or preference", () => {
    const author = publicSupporter({
      name: "Ada",
      avatarFrame: null,
      plan: "FREE",
      supporterGiftUntil: new Date(Date.now() + 86400000),
      supporterGiftPermanent: false,
      showSupporterBadge: true,
    });
    expect(author).toEqual({ name: "Ada", avatarFrame: null, supporter: true });
    expect(JSON.stringify(author)).not.toMatch(/plan|Gift|show/i);
    expect(publicSupporter({ name: "Bo", plan: "FREE", showSupporterBadge: true })).toEqual({
      name: "Bo",
      supporter: false,
    });
  });
  it("shows only while the Supporter keeps it on", () => {
    expect(showsBadge({ plan: "SUPPORTER", showSupporterBadge: true })).toBe(true);
    expect(showsBadge({ supporterGiftPermanent: true, showSupporterBadge: true })).toBe(true);
    // Turned off in Settings: hidden everywhere, plan or gift alike.
    expect(showsBadge({ plan: "SUPPORTER", showSupporterBadge: false })).toBe(false);
    expect(showsBadge({ supporterGiftPermanent: true, showSupporterBadge: false })).toBe(false);
    expect(publicSupporter({ name: "Cy", plan: "SUPPORTER", showSupporterBadge: false })).toEqual({
      name: "Cy",
      supporter: false,
    });
    // A query that forgets the preference column never shows a badge the player hid.
    expect(showsBadge({ plan: "SUPPORTER" })).toBe(false);
    // A free account never shows one, whatever the preference; nor does the launch grant.
    expect(showsBadge({ plan: "FREE", showSupporterBadge: true })).toBe(false);
    expect(
      showsBadge({
        plan: "FREE",
        supporterGiftUntil: new Date(Date.now() - 1),
        showSupporterBadge: true,
      }),
    ).toBe(false);
    expect(showsBadge(null)).toBe(false);
  });
});

describe("when the plan is on sale", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_fixture");
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
    legal.published = true;
    launchGrant.closedAt = new Date("2026-11-15T00:00:00Z");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    launchGrant.closedAt = null;
  });
  it("needs Stripe keys, a closed launch and published terms", () => {
    expect(salesOpen()).toBe(true);
    launchGrant.closedAt = null;
    expect(salesOpen()).toBe(false);
    launchGrant.closedAt = new Date("2026-11-15T00:00:00Z");
    legal.published = false;
    expect(salesOpen()).toBe(false);
    legal.published = true;
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(salesOpen()).toBe(false);
  });
});

describe("the order's consent and price", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("needs all four Stripe settings, the publishable key included", async () => {
    const { stripeConfig } = await import("@/lib/billing/stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_fixture");
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "");
    expect(stripeConfig()).toBeNull();
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
    expect(stripeConfig()?.publishableKey).toBe("pk_test_fixture");
    vi.unstubAllEnvs();
  });
  it("reads the Stripe price in the visitor's language, never a fixed number", async () => {
    const { formatPrice } = await import("@/lib/billing/price");
    const price = {
      id: "price_1",
      unit_amount: 299,
      currency: "eur",
      recurring: { interval: "month", interval_count: 1 },
      product: "prod_1",
    };
    expect(formatPrice(price, "en")).toBe("€2.99 per month");
    expect(formatPrice(price, "de")).toBe("2,99 € pro Monat");
    expect(formatPrice({ ...price, unit_amount: null }, "en")).toBeNull();
    expect(formatPrice(null)).toBeNull();
  });
});
