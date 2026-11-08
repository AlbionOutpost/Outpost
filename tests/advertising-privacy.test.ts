import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: state.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: state.user } } }));

import { AdsenseLoader, adsenseClient } from "@/components/adsense-loader";
import { AdSlot } from "@/components/ad-slot";
import { GET as sellerDeclaration } from "@/app/ads.txt/route";
import { proxy } from "@/proxy";
import { launchGrant } from "@/lib/billing/plan";

const publisher = "ca-pub-1234567890123456";
const noAdMarkup = (html: string) => {
  expect(html).not.toMatch(/<script\b|<ins\b|<iframe\b|adsbygoogle|googlesyndication|doubleclick/i);
  expect(html).not.toMatch(/data-ad-(?:client|slot|format)/i);
};
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT", publisher);
  vi.stubEnv("NEXT_PUBLIC_ADSENSE_SLOT_HUB", "1234567890");
  vi.stubEnv("NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE", "9876543210");
  state.session.mockReset().mockResolvedValue(null);
  state.user.mockReset().mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllEnvs();
  launchGrant.closedAt = null;
});

describe("advertising stays closed until the imprint is complete", () => {
  it("configured ownership renders passive metadata, never an advertising loader", () => {
    const html = renderToStaticMarkup(AdsenseLoader());
    expect(html).toContain('<meta name="google-adsense-account"');
    expect(html).toContain(`content="${publisher}"`);
    noAdMarkup(html);
  });

  it.each([undefined, "", "pub-1234567890123456", "ca-pub-invalid", 'ca-pub-12"><script>'])(
    "missing or malformed publisher configuration produces no loader or metadata: %s",
    (value) => {
      vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT", value);
      expect(adsenseClient()).toBeNull();
      expect(renderToStaticMarkup(AdsenseLoader())).toBe("");
    },
  );

  it.each(["hub", "article"] as const)(
    "configured %s slots render nothing unless a first-party offer was requested",
    async (placement) => {
      expect(await AdSlot({ placement })).toBeNull();
      expect(state.session).not.toHaveBeenCalled();
      expect(state.user).not.toHaveBeenCalled();
    },
  );

  it("the anonymous offer is a first-party Supporter link, not an ad placement", async () => {
    const html = renderToStaticMarkup(
      await AdSlot({ placement: "hub", offer: true, suffix: "?region=asia" }),
    );
    expect(html).toContain('aria-label="Support Outpost"');
    expect(html).toContain('href="/supporter?region=asia"');
    expect(html).toContain("About Supporter");
    expect(html).not.toContain("Sponsored");
    noAdMarkup(html);
    expect(state.user).not.toHaveBeenCalled();
  });

  it("server-side entitlement suppresses offers for Supporters in both placements", async () => {
    state.session.mockResolvedValue({ user: { id: "server-supporter" } });
    state.user.mockResolvedValue({ plan: "SUPPORTER" });
    for (const placement of ["hub", "article"] as const)
      expect(await AdSlot({ placement, offer: true })).toBeNull();
    expect(state.user).toHaveBeenCalledWith({
      where: { id: "server-supporter" },
      select: {
        plan: true,
        supporterGiftUntil: true,
        supporterGiftPermanent: true,
        createdAt: true,
      },
    });
  });

  it("the open launch grant makes every signed-in account a Supporter", async () => {
    state.session.mockResolvedValue({ user: { id: "free-account" } });
    state.user.mockResolvedValue({ plan: "FREE", createdAt: new Date() });
    expect(await AdSlot({ placement: "hub", offer: true })).toBeNull();
  });

  it("a claimed client/session plan cannot override the current server record", async () => {
    // After the launch closes, an account created later is not covered by the grant.
    launchGrant.closedAt = new Date(Date.now() - 60000);
    state.session.mockResolvedValue({ user: { id: "free-account", plan: "SUPPORTER" } });
    state.user.mockResolvedValue({ plan: "FREE" });
    const html = renderToStaticMarkup(await AdSlot({ placement: "article", offer: true }));
    expect(html).toContain('href="/supporter"');
    noAdMarkup(html);
    expect(state.user).toHaveBeenCalledWith({
      where: { id: "free-account" },
      select: {
        plan: true,
        supporterGiftUntil: true,
        supporterGiftPermanent: true,
        createdAt: true,
      },
    });
  });

  it("server-side gifts suppress offers and expired gifts do not", async () => {
    launchGrant.closedAt = new Date(Date.now() - 60000);
    state.session.mockResolvedValue({ user: { id: "gift-account" } });
    state.user.mockResolvedValue({
      plan: "FREE",
      supporterGiftUntil: new Date(Date.now() + 60000),
    });
    expect(await AdSlot({ placement: "hub", offer: true })).toBeNull();
    state.user.mockResolvedValue({ plan: "FREE", supporterGiftUntil: new Date(Date.now() - 1) });
    expect(renderToStaticMarkup(await AdSlot({ placement: "hub", offer: true }))).toContain(
      'href="/supporter"',
    );
  });

  it("server entitlement failures do not fall back to an advertising or offer response", async () => {
    state.session.mockResolvedValue({ user: { id: "unavailable-account" } });
    state.user.mockRejectedValue(new Error("Account store unavailable"));
    await expect(AdSlot({ placement: "hub", offer: true })).rejects.toThrow(
      "Account store unavailable",
    );
  });
});

describe("security policy and seller declaration without active ads", () => {
  it.each(["production", "development"] as const)(
    "configured publisher does not add advertising origins to %s CSP; nonce/Turnstile remain",
    (mode) => {
      vi.stubEnv("NODE_ENV", mode);
      const request = new NextRequest("https://outpost.example/?region=asia");
      const response = proxy(request);
      const csp = response.headers.get("Content-Security-Policy")!;
      expect(csp).not.toMatch(
        /googlesyndication|doubleclick|adtrafficquality|googleusercontent|csi\.gstatic|www\.google\.com/,
      );
      expect(csp).toMatch(
        /script-src[^;]*'nonce-[^']+'[^;]*'strict-dynamic'[^;]*https:\/\/challenges\.cloudflare\.com/,
      );
      expect(csp).toContain("frame-src https://challenges.cloudflare.com");
      expect(csp).toContain("connect-src 'self' https://challenges.cloudflare.com");
      expect(csp).toContain("https://render.albiononline.com https://cdn.discordapp.com");
      expect(csp).toContain("object-src 'none'");
      expect(csp.includes("'unsafe-eval'")).toBe(mode === "development");
      const nonce = response.headers.get("x-middleware-request-x-nonce")!;
      expect(nonce).toBeTruthy();
      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("x-middleware-request-x-outpost-region")).toBe("asia");
      expect(proxy(request).headers.get("x-middleware-request-x-nonce")).not.toBe(nonce);
    },
  );

  it("ads.txt retains the configured authorized-seller declaration without loading an ad", async () => {
    const response = sellerDeclaration();
    expect(await response.text()).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT", "invalid");
    expect(await sellerDeclaration().text()).toBe(
      "# No advertising seller is configured for this site.\n",
    );
  });
});

describe("active advertising (publisher id, unit ids and a complete imprint)", () => {
  beforeEach(() => {
    vi.stubEnv("OPERATOR_NAME", "Example Operator");
    vi.stubEnv("OPERATOR_ADDRESS", "Example Street 1, 12345 Example");
    vi.stubEnv("OPERATOR_EMAIL", "operator@example.org");
  });

  it("loads Google's ad and consent script with the request nonce, never for Supporters", () => {
    const html = renderToStaticMarkup(AdsenseLoader({ nonce: "n0nce" }));
    expect(html).toContain('<meta name="google-adsense-account"');
    expect(html).toContain(
      `src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisher}"`,
    );
    expect(html).toContain('nonce="n0nce"');
    expect(renderToStaticMarkup(AdsenseLoader({ supporter: true }))).not.toMatch(/<script\b/);
  });

  it("a missing imprint field keeps ads off", () => {
    vi.stubEnv("OPERATOR_ADDRESS", " ");
    expect(renderToStaticMarkup(AdsenseLoader({ nonce: "n0nce" }))).not.toMatch(/<script\b/);
  });

  it.each([
    ["hub", "1234567890"],
    ["article", "9876543210"],
  ] as const)("the %s placement renders its labelled unit", async (placement, slot) => {
    const html = renderToStaticMarkup(await AdSlot({ placement }));
    expect(html).toContain('aria-label="Advertisement"');
    expect(html).toContain(`data-ad-client="${publisher}"`);
    expect(html).toContain(`data-ad-slot="${slot}"`);
  });

  it("Supporters get no unit, checked against the server record", async () => {
    state.session.mockResolvedValue({ user: { id: "server-supporter" } });
    state.user.mockResolvedValue({ plan: "SUPPORTER" });
    expect(await AdSlot({ placement: "hub" })).toBeNull();
  });

  it("a malformed unit id renders nothing", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_SLOT_HUB", '1"><script>');
    expect(await AdSlot({ placement: "hub" })).toBeNull();
  });

  it("the CSP opens Google's ad and consent origins and keeps the nonce and strict-dynamic", () => {
    const csp = proxy(new NextRequest("https://outpost.example/")).headers.get(
      "Content-Security-Policy",
    )!;
    expect(csp).toMatch(/frame-src [^;]*https:\/\/\*\.googlesyndication\.com/);
    expect(csp).toMatch(/frame-src [^;]*https:\/\/fundingchoicesmessages\.google\.com/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.doubleclick\.net/);
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("object-src 'none'");
  });
});
