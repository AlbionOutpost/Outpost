import "server-only";
import { getPrice, stripeConfig, type StripePrice } from "./stripe";

let priceCache: { at: number; price: StripePrice | null } | null = null;

/** How a Stripe price reads: "€2.99 per month" or "2,99 € pro Monat"; null without an amount. */
export function formatPrice(price: StripePrice | null, locale: "en" | "de" = "en") {
  if (!price || price.unit_amount == null) return null;
  const amount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
  }).format(price.unit_amount / 100);
  const recurring = price.recurring;
  if (!recurring) return amount;
  const units: Record<string, [string, string, string]> = {
    day: ["day", "Tag", "Tage"],
    week: ["week", "Woche", "Wochen"],
    month: ["month", "Monat", "Monate"],
    year: ["year", "Jahr", "Jahre"],
  };
  const [en, de, dePlural] = units[recurring.interval] ?? [
    recurring.interval,
    recurring.interval,
    recurring.interval,
  ];
  const every =
    recurring.interval_count > 1
      ? locale === "de"
        ? `alle ${recurring.interval_count} ${dePlural}`
        : `every ${recurring.interval_count} ${en}s`
      : locale === "de"
        ? `pro ${de}`
        : `per ${en}`;
  return `${amount} ${every}`;
}

/** The live price from Stripe, cached ten minutes; null when billing is off or Stripe is unreachable. */
export async function supporterPrice(locale: "en" | "de" = "en") {
  const config = stripeConfig();
  if (!config) return null;
  if (!priceCache || Date.now() - priceCache.at >= 600000) {
    try {
      priceCache = { at: Date.now(), price: await getPrice(config) };
    } catch {
      priceCache = { at: Date.now(), price: null };
    }
  }
  return formatPrice(priceCache.price, locale);
}
