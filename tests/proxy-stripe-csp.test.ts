import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/* The payment form's Stripe.js origins enter the CSP only while billing is configured, exactly
 * the ones Stripe's CSP guide lists for Stripe.js, 3-D Secure and Link, and never weaken the
 * nonce + strict-dynamic script policy. */
const policy = () =>
  proxy(new NextRequest("https://outpost.example/supporter")).headers.get(
    "Content-Security-Policy",
  )!;
const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((part) => part.startsWith(`${name} `))!
    .split(" ")
    .slice(1);
const configure = (publishable = "pk_test_fixture") => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  vi.stubEnv("STRIPE_PRICE_SUPPORTER", "price_fixture");
  vi.stubEnv("STRIPE_PUBLISHABLE_KEY", publishable);
};
afterEach(() => vi.unstubAllEnvs());

it("allows no Stripe origin while billing is off or only partly configured", () => {
  expect(policy()).not.toMatch(/stripe\.com|link\.com/);
  configure("");
  expect(policy()).not.toMatch(/stripe\.com|link\.com/);
});

it("allows exactly Stripe.js, its frames, 3-D Secure, Link and the API once billing is configured", () => {
  configure();
  const csp = policy();
  const script = directive(csp, "script-src");
  expect(script.slice(0, 3)).toEqual([
    "'self'",
    expect.stringMatching(/^'nonce-/),
    "'strict-dynamic'",
  ]);
  expect(script).toEqual(
    expect.arrayContaining(["https://js.stripe.com", "https://*.js.stripe.com"]),
  );
  expect(script).not.toContain("'unsafe-inline'");
  expect(directive(csp, "frame-src")).toEqual([
    "https://challenges.cloudflare.com",
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://hooks.stripe.com",
    "https://link.com",
    "https://*.link.com",
  ]);
  expect(directive(csp, "connect-src")).toEqual(
    expect.arrayContaining(["https://api.stripe.com", "https://link.com", "https://*.link.com"]),
  );
  expect(directive(csp, "img-src")).toContain("https://*.link.com");
  // Nothing else widens: no wildcard Stripe host, forms still post only to Outpost.
  expect(csp).not.toMatch(/https:\/\/\*\.stripe\.com|checkout\.stripe\.com/);
  expect(csp).toContain("form-action 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
});
