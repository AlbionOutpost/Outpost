import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/link", () => ({
  default: (props: Record<string, unknown>) => createElement("a", props),
}));
import { SupporterOrder } from "@/components/supporter-order";
import { paymentMessage, stripeAppearance } from "@/components/stripe-payment";

const render = (props: Partial<Parameters<typeof SupporterOrder>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(SupporterOrder, {
      region: "europe",
      price: "4,99 € pro Monat",
      locale: "de",
      smallBusiness: false,
      publishableKey: "pk_test_fixture",
      ...props,
    }),
  );

describe("the order box before the buyer starts", () => {
  it("loads no Stripe code and shows the unticked terms box and the step to payment", () => {
    const html = render();
    expect(html).not.toMatch(/js\.stripe\.com|<script|<iframe/);
    expect(html).not.toContain("pk_test_fixture");
    expect(html).toContain('<input type="checkbox" required="" name="terms"/>');
    expect(html).toMatch(
      /<button type="submit" class="button primary" disabled="">Weiter zur Zahlung/,
    );
    expect(html).toContain("4,99 € pro Monat");
    expect(html).not.toContain("Zahlungspflichtig bestellen");
  });
  it("shows a missing price as missing and offers no order", () => {
    const html = render({ price: null, locale: "en" });
    expect(html).toContain("Unavailable");
    expect(html).toContain("The price could not be loaded");
    expect(html).toMatch(/disabled="">Continue to payment/);
  });
  it("says so in the alert region when Stripe sent the buyer back after a failed payment", () => {
    expect(render({ failed: true, locale: "en" })).toMatch(
      /<p role="alert"[^>]*>The payment did not go through/,
    );
    expect(render()).toMatch(/<p role="alert"[^>]*hidden=""><\/p>/);
  });
});

describe("the payment form's look", () => {
  const tokens = {
    field: "rgb(14, 15, 18)",
    edge: "rgb(70, 73, 80)",
    text: "rgb(241, 238, 231)",
    secondary: "rgb(197, 195, 190)",
    muted: "rgb(170, 169, 165)",
    accent: "rgb(238, 148, 90)",
    danger: "rgb(239, 105, 105)",
    focus: "rgb(130, 185, 255)",
  };
  it("takes every colour from the resolved tokens and follows the surface it sits on", () => {
    const dark = stripeAppearance(tokens);
    expect(dark.theme).toBe("night");
    expect(stripeAppearance({ ...tokens, field: "rgb(196, 162, 131)" }).theme).toBe("stripe");
    expect(dark.variables).toMatchObject({
      colorPrimary: tokens.accent,
      colorBackground: tokens.field,
      colorText: tokens.text,
      colorDanger: tokens.danger,
      fontFamily: "Inter, Arial, sans-serif",
      borderRadius: "10px",
    });
    // No colour is invented: every colour value is one of the tokens.
    const values = [
      ...Object.values(dark.variables),
      ...Object.values(dark.rules).flatMap((rule) => Object.values(rule)),
    ].join(" ");
    for (const match of values.match(/rgb\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? [])
      expect(Object.values(tokens)).toContain(match);
    // No text under 12px inside the form.
    expect(Number.parseInt(dark.variables.fontSizeBase)).toBeGreaterThanOrEqual(12);
    expect(Number.parseInt(dark.rules[".Label"].fontSize)).toBeGreaterThanOrEqual(12);
  });
  it("shows Stripe's card and validation messages and a plain fallback for the rest", () => {
    expect(paymentMessage({ type: "card_error", message: "Your card was declined." }, "x")).toBe(
      "Your card was declined.",
    );
    expect(paymentMessage({ type: "api_error", message: "Internal detail" }, "Try again")).toBe(
      "Try again",
    );
  });
});
