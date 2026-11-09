/**
 * Stripe.js for the Supporter payment form, loaded only when a buyer starts an order: no
 * Stripe code is in any bundle and no page loads it up front. Card data is typed into Stripe's
 * own iframes and goes straight to Stripe. Only the few calls Outpost uses are typed here.
 */
export type StripeError = { type?: string; code?: string; message?: string };
export type PaymentElement = {
  mount(target: HTMLElement): void;
  destroy(): void;
  focus(): void;
  on(event: "ready", handler: () => void): void;
  on(event: "change", handler: (event: { complete: boolean }) => void): void;
  on(event: "loaderror", handler: (event: { error: StripeError }) => void): void;
};
export type StripeElements = {
  create(type: "payment", options?: Record<string, unknown>): PaymentElement;
  update(options: { appearance: StripeAppearance }): void;
};
export type StripeClient = {
  elements(options: {
    clientSecret: string;
    appearance: StripeAppearance;
    locale: string;
  }): StripeElements;
  confirmPayment(options: {
    elements: StripeElements;
    confirmParams: { return_url: string };
    redirect: "if_required";
  }): Promise<{ error?: StripeError; paymentIntent?: { status: string } }>;
};
type StripeFactory = (publishableKey: string, options?: { locale?: string }) => StripeClient;
declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

/** Stripe's own loader URL: Stripe.js must come from js.stripe.com, never a bundle or a copy. */
export const stripeJs = "https://js.stripe.com/v3/";
let loading: Promise<StripeFactory> | null = null;

/** Adds the Stripe.js script once; a failed load can be retried. */
export function loadStripe(): Promise<StripeFactory> {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  loading ??= new Promise<StripeFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = stripeJs;
    script.async = true;
    script.onload = () =>
      window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js did not start"));
    script.onerror = () => {
      script.remove();
      reject(new Error("Stripe.js did not load"));
    };
    document.head.append(script);
  }).catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}

/** The design tokens the payment form takes, already resolved to sRGB colours. */
export type PaymentTokens = {
  field: string;
  edge: string;
  text: string;
  secondary: string;
  muted: string;
  accent: string;
  danger: string;
  focus: string;
};
export type StripeAppearance = {
  theme: "night" | "stripe";
  variables: Record<string, string>;
  rules: Record<string, Record<string, string>>;
};

/**
 * Stripe's Appearance API from Outpost's tokens (DESIGN.md): fields are wells cut into the raised
 * order panel (colours as `rgb(r, g, b)`), the accent marks focus and the selected tab, and errors use the error token. The
 * iframe cannot load Outpost's self-hosted Inter, so it falls back as DESIGN.md's stack does.
 */
export function stripeAppearance(tokens: PaymentTokens): StripeAppearance {
  const ring = `0 0 0 2px ${tokens.focus}`;
  // Stripe's base theme follows the surface the form sits on, not the site switch: the light
  // theme keeps some framed panels dark.
  const [r, g, b] = (tokens.field.match(/\d+/g) ?? []).map(Number);
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 128;
  return {
    theme: light ? "stripe" : "night",
    variables: {
      colorPrimary: tokens.accent,
      colorBackground: tokens.field,
      colorText: tokens.text,
      colorTextSecondary: tokens.secondary,
      colorTextPlaceholder: tokens.muted,
      colorDanger: tokens.danger,
      colorIcon: tokens.secondary,
      fontFamily: "Inter, Arial, sans-serif",
      fontSizeBase: "14px",
      fontWeightNormal: "400",
      fontWeightMedium: "600",
      borderRadius: "10px",
      spacingUnit: "4px",
      gridRowSpacing: "12px",
      focusBoxShadow: ring,
      focusOutline: "none",
    },
    rules: {
      ".Input": { border: `1px solid ${tokens.edge}`, boxShadow: "none", padding: "11px 12px" },
      ".Input:focus": { borderColor: tokens.accent, boxShadow: ring },
      ".Input--invalid": { borderColor: tokens.danger, boxShadow: "none" },
      ".Label": { color: tokens.secondary, fontWeight: "600", fontSize: "13px" },
      ".Tab": {
        border: `1px solid ${tokens.edge}`,
        backgroundColor: tokens.field,
        boxShadow: "none",
      },
      ".Tab:hover": { color: tokens.text },
      ".Tab--selected": { borderColor: tokens.accent, boxShadow: `0 0 0 1px ${tokens.accent}` },
      ".Tab:focus": { boxShadow: ring },
      ".Error": { color: tokens.danger, fontSize: "13px" },
    },
  };
}

/** Reads the tokens where the form sits (light or dark theme), as opaque colours. */
export function readPaymentTokens(where: HTMLElement): PaymentTokens {
  const probe = document.createElement("span");
  probe.hidden = true;
  where.append(probe);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const paint = canvas.getContext("2d", { willReadFrequently: true });
  // Translucent tokens (the well) are laid over the raised surface they sit on.
  const resolve = (...layers: string[]) => {
    const colors = layers.map((name) => {
      probe.style.color = `var(${name})`;
      return getComputedStyle(probe).color;
    });
    if (!paint) return colors.at(-1)!;
    paint.clearRect(0, 0, 1, 1);
    for (const color of colors) {
      paint.fillStyle = color;
      paint.fillRect(0, 0, 1, 1);
    }
    const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
  const tokens = {
    field: resolve("--surface-raised", "--well"),
    edge: resolve("--surface-raised", "--control-edge"),
    text: resolve("--surface-raised", "--text"),
    secondary: resolve("--surface-raised", "--secondary"),
    muted: resolve("--surface-raised", "--muted"),
    accent: resolve("--surface-raised", "--accent"),
    danger: resolve("--surface-raised", "--error"),
    focus: resolve("--surface-raised", "--focus"),
  };
  probe.remove();
  return tokens;
}

/** A buyer-facing message for a failed confirmation; Stripe localises card errors itself. */
export function paymentMessage(error: StripeError, fallback: string) {
  return (error.type === "card_error" || error.type === "validation_error") && error.message
    ? error.message
    : fallback;
}
