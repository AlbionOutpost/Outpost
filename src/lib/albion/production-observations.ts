import { productionOutputQuality, type ProductionInput } from "./production";

/** Identity of the source request; quantity and manual assumptions do not fetch new prices. */
export function productionPriceQuery(v: ProductionInput) {
  return new URLSearchParams({
    kind: v.kind,
    region: v.region,
    recipeId: v.recipeId,
    materialCity: v.materialCity,
    outputCity: v.outputCity,
    quality: String(productionOutputQuality(v)),
    enchantFamily: v.enchantFamily,
    tier: String(v.tier),
    fromEnchant: String(v.fromEnchant),
    toEnchant: String(v.toEnchant),
  }).toString();
}

/** A pending refresh must never replace a newer selection or a price edited while it loaded. */
export function mergeProductionObservations(
  current: ProductionInput,
  requested: ProductionInput,
  observed: ProductionInput["prices"],
  overwrite: boolean,
): ProductionInput {
  if (productionPriceQuery(current) !== productionPriceQuery(requested)) return current;
  const prices = { ...current.prices };
  for (const [id, value] of Object.entries(observed)) {
    const existing = current.prices[id];
    const editedDuringRequest = existing !== requested.prices[id];
    if (editedDuringRequest) continue;
    if (!overwrite && existing?.manual && existing.value !== null) continue;
    prices[id] = value;
  }
  return { ...current, prices };
}
