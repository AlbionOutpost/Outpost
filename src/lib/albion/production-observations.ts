import {
  productionOutputQuality,
  productionSellsInstantly,
  type ProductionInput,
} from "./production";
import type { Recipe } from "./recipes";
import type { MarketPrice } from "./market-quotes";

type PriceRequest = {
  id: string;
  quality: number;
  city: ProductionInput["materialCity"];
  execution: "instant-purchase" | "instant-sale" | "listing";
};
/** What a run prices: each material bought from sell orders in the material city, and the output
 * listed in the sale city — or, at the Black Market, sold instantly to its highest buy order. */
export function productionPriceRequests(
  recipe: Recipe,
  v: Pick<ProductionInput, "kind" | "quality" | "materialCity" | "outputCity" | "recipeId">,
): PriceRequest[] {
  return [
    ...recipe.ingredients.map((i) => ({
      id: i.id,
      quality: i.quality === "selected" ? v.quality : 1,
      city: v.materialCity,
      execution: "instant-purchase" as const,
    })),
    {
      id: recipe.output,
      quality: productionOutputQuality(v),
      city: v.outputCity,
      execution: productionSellsInstantly(v) ? ("instant-sale" as const) : ("listing" as const),
    },
  ];
}
/** Source observations for those requests; an observed 0 or a missing row stays unavailable. */
export function observedProductionPrices(
  requests: PriceRequest[],
  rows: MarketPrice[],
  region: ProductionInput["region"],
): ProductionInput["prices"] {
  return Object.fromEntries(
    requests.map((r) => {
      const row = rows.find(
        (p) => p.item_id === r.id && p.quality === r.quality && p.city === r.city,
      );
      const bid = r.execution === "instant-sale";
      const value = (bid ? row?.buy_price_max : row?.sell_price_min) || null;
      return [
        r.id,
        {
          value,
          manual: false,
          observedAt: value ? (bid ? row!.buy_price_max_date : row!.sell_price_min_date) : null,
          execution: r.execution,
          region,
          city: r.city,
          quality: r.quality,
        },
      ];
    }),
  );
}

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
