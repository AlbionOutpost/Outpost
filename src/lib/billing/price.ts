import "server-only";
import { getPrice, stripeConfig } from "./stripe";

let priceCache: { at: number; label: string | null } | null = null;
/** The live price from Stripe, cached ten minutes; null when billing is off or Stripe is unreachable. */
export async function supporterPrice() {
  const config = stripeConfig();
  if (!config) return null;
  if (priceCache && Date.now() - priceCache.at < 600000) return priceCache.label;
  try {
    const price = await getPrice(config);
    const amount =
      price.unit_amount == null
        ? null
        : new Intl.NumberFormat("en", { style: "currency", currency: price.currency }).format(
            price.unit_amount / 100,
          );
    const every = price.recurring
      ? price.recurring.interval_count > 1
        ? `every ${price.recurring.interval_count} ${price.recurring.interval}s`
        : `per ${price.recurring.interval}`
      : "";
    priceCache = { at: Date.now(), label: amount ? `${amount} ${every}`.trim() : null };
  } catch {
    priceCache = { at: Date.now(), label: null };
  }
  return priceCache.label;
}
