import { findRecipe } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { cities, type Region } from "@/lib/albion/region-config";
import type { MarketPrice } from "@/lib/albion/market-client";
import { initialProduction, production, type ProductionInput } from "@/lib/albion/production";
import bundled from "@/lib/albion/expanded-recipes.json" with { type: "json" };

/** A detailed showcase: bundled T4–T6 crafts with at least two actual inputs, one price batch. */
const candidates = (bundled as { id: string; kind: string; ingredients: unknown[] }[])
  .filter((r) => r.kind === "crafting" && /-t[4-6]$/.test(r.id) && r.ingredients.length >= 2)
  .map((r) => r.id);
/**
 * A royal city's base production bonus (18%) without focus: exactly 18/118 of materials back
 * (15.254…%). Kept unrounded for the calculation; the card rounds it only for display.
 */
const BASE_BONUS = 18;
const RETURN_RATE = (100 * BASE_BONUS) / (100 + BASE_BONUS);
type City = (typeof cities)[number];
const royal = cities.filter((c): c is City => c !== "Black Market" && c !== "Brecilien");

const recipes = () =>
  candidates.flatMap((id) => {
    const r = findRecipe(id);
    return r ? [r] : [];
  });

/** Every item (materials and outputs) the showcase crafts need priced, at quality 1. */
export const landingCraftItems = () => [
  ...new Set(recipes().flatMap((r) => [...r.ingredients.map((i) => i.id), r.output])),
];

/**
 * The most worthwhile multi-material craft among the bundled T4–T6 recipes: every candidate
 * priced in every royal city from one batch of observations (`rows`, quality 1, covering
 * `landingCraftItems()`), run through the same `production()` as the calculator, ranked by
 * margin. Only cities where every price is known count as results; if none qualify the
 * best-covered scenario is returned with its missing prices listed.
 */
export function landingCraftQuote(region: Region, batches: number, rows: MarketPrice[]) {
  const list = recipes();
  const scenario = (recipe: (typeof list)[number], city: City) => {
    const prices: ProductionInput["prices"] = Object.fromEntries(
      [...recipe.ingredients.map((i) => i.id), recipe.output].map((id) => {
        const row = rows.find((p) => p.item_id === id && p.quality === 1 && p.city === city);
        return [
          id,
          {
            value: row?.sell_price_min || null,
            manual: false,
            observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
            region,
            city,
            quality: 1,
          },
        ];
      }),
    );
    const result = production({
      ...initialProduction(recipe.kind, region),
      recipeId: recipe.id,
      batches,
      materialCity: city,
      outputCity: city,
      prices,
      // The city's base resource return without focus, premium sales tax and the sell-order
      // setup fee; no focus, city specialty bonus or station fee.
      returns: Object.fromEntries(recipe.ingredients.map((i) => [i.id, true])),
      returnRate: RETURN_RATE,
      tax: 4,
      setupFee: 2.5,
    });
    return {
      recipe: { id: recipe.id, name: recipe.name, output: recipe.output, kind: recipe.kind },
      city,
      rows: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        gross: r.gross,
      })),
      outputQuantity: result.outputQuantity,
      complete: result.complete,
      missing: result.missing,
      stale: result.stale,
      upfront: result.upfront,
      fees: result.fees,
      revenue: result.revenue,
      profit: result.profit,
      margin: result.margin,
    };
  };
  const all = list.flatMap((r) => royal.map((city) => scenario(r, city)));
  // A lone sell order far above the item's usual price (someone listing a cape for millions)
  // is a real observation but not a trade anyone will get: it may not be the showcase. An
  // output priced over 2.5x its median across the royal cities (with 3+ quotes) is skipped.
  const outputPrice = (id: string, city: City) =>
    rows.find((p) => p.item_id === id && p.quality === 1 && p.city === city)?.sell_price_min || 0;
  const median = (values: number[]) => {
    const v = values.filter((x) => x > 0).sort((a, b) => a - b);
    return v.length >= 3 ? v[Math.floor(v.length / 2)] : null;
  };
  const typical = new Map(
    list.map((r) => [r.output, median(royal.map((c) => outputPrice(r.output, c)))]),
  );
  const believable = (s: (typeof all)[number]) => {
    const usual = typical.get(s.recipe.output);
    return usual == null || outputPrice(s.recipe.output, s.city) <= usual * 2.5;
  };
  const complete = all.filter((s) => s.complete && s.margin != null && believable(s));
  const best =
    complete.toSorted((a, b) => b.margin! - a.margin!)[0] ??
    all.toSorted((a, b) => a.missing.length - b.missing.length)[0];
  const byCity = complete
    .filter((s) => s.recipe.id === best.recipe.id)
    .toSorted((a, b) => b.profit! - a.profit!)
    .map((s) => ({ city: s.city, profit: s.profit!, margin: s.margin! }));
  // Cities where the same recipe cannot be priced completely: named, never estimated
  const unpriced = all
    .filter((s) => s.recipe.id === best.recipe.id && s.missing.length)
    .map((s) => s.city);
  return {
    region,
    source: "Albion Online Data Project" as const,
    batches,
    candidates: list.length,
    assumptions: { tax: 4, setupFee: 2.5, returnRate: RETURN_RATE, useFocus: false },
    best,
    byCity,
    unpriced,
  };
}
