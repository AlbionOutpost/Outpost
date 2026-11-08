import { z } from "zod";
import { cities, regionSchema } from "./region-config";
import { registerRecipes, type Recipe } from "./recipes";
import { initialProduction, production, type ProductionInput } from "./production";
import { productionCities, sourcedReturnRates, type MechanicsProfile } from "./production-profile";
import { observedProductionPrices, productionPriceRequests } from "./production-observations";
import { sourceTimestamp, isStale } from "./freshness";
import type { MarketPrice } from "./market-quotes";

/** Everything a player chooses on the craft finder; prices and recipes come from the server. */
export const craftSettings = z.object({
  region: regionSchema,
  buyCity: z.enum(cities).refine((c) => c !== "Black Market", "Materials come from a city"),
  craftCity: z.enum(productionCities),
  sellCity: z.enum(cities),
  quality: z.number().int().min(1).max(5),
  dailyBonus: z.union([z.literal(0), z.literal(10), z.literal(20)]),
  tax: z.number().min(0).max(100),
  setupFee: z.number().min(0).max(100),
});
export type CraftSettings = z.infer<typeof craftSettings>;

/** One recipe at one craft: the production engine's result plus what the budget buys. */
export type CraftRow = {
  recipe: Pick<Recipe, "id" | "name" | "output" | "outputCount" | "category" | "tier"> & {
    ingredients: string[];
  };
  run: ProductionInput;
  returnRate: number;
  complete: boolean;
  missing: string[];
  stale: boolean;
  /** The oldest observation that fed this row (DATA.md: plans keep the oldest timestamp). */
  oldestAt: string | null;
  upfront: number | null;
  revenue: number | null;
  fees: number | null;
  profit: number | null;
  margin: number | null;
  /** Whole crafts the budget pays for up front (1 when no budget is set); null when unpriced. */
  crafts: number | null;
  /** Profit per craft × crafts. */
  total: number | null;
};

/** The production run the calculator would make for this recipe with these settings, priced. */
export function craftRun(recipe: Recipe, rows: MarketPrice[], s: CraftSettings) {
  let rates = { returnRate: 0 };
  try {
    rates = sourcedReturnRates("crafting", recipe.output, s.craftCity, s.dailyBonus, recipe.id);
  } catch {
    // No city bonus is recorded for this category: returns stay at 0 and the row says so.
  }
  const profile: MechanicsProfile = {
    version: "grind-20261027",
    city: s.craftCity,
    dailyBonus: s.dailyBonus,
    refiningLevels: [0, 0, 0, 0, 0],
  };
  const base = {
    ...initialProduction("crafting", s.region),
    mechanicsProfile: profile,
    recipeId: recipe.id,
    materialCity: s.buyCity,
    outputCity: s.sellCity,
    quality: s.quality,
    returnRate: rates.returnRate,
    // Ticked as the profile does it; production() never returns non-returnable inputs anyway.
    returns: Object.fromEntries(recipe.ingredients.map((i) => [i.id, i.returnable !== false])),
    tax: s.tax,
    setupFee: s.setupFee,
  } satisfies ProductionInput;
  const prices = observedProductionPrices(productionPriceRequests(recipe, base), rows, s.region);
  return { ...base, prices };
}

/**
 * Ranks every recipe by what it makes: per craft with no budget, or for as many whole crafts as
 * the budget pays for up front. Rows with a missing price are never ranked as zero; they are
 * returned separately with what is missing. Expected values are worked by hand in
 * tests/craft-ranking.test.ts.
 */
export function rankCrafts(
  recipes: Recipe[],
  rows: MarketPrice[],
  settings: CraftSettings,
  budget: number | null,
  now = Date.now(),
) {
  const s = craftSettings.parse(settings);
  if (budget !== null && (!Number.isFinite(budget) || budget <= 0 || budget > 1e12))
    throw new Error("Enter a budget above 0 and at most one trillion silver");
  // production() resolves recipes by id; the finder's recipes came from the server.
  registerRecipes(recipes);
  const all: CraftRow[] = recipes.map((recipe) => {
    const run = craftRun(recipe, rows, s);
    const result = production(run);
    const dates = Object.values(run.prices)
      .map((p) => p.observedAt)
      .filter((d): d is string => !!d)
      .sort((a, b) => sourceTimestamp(a) - sourceTimestamp(b));
    const crafts =
      !result.complete || !result.upfront
        ? null
        : budget === null
          ? 1
          : Math.min(100000, Math.floor(budget / result.upfront));
    return {
      recipe: {
        id: recipe.id,
        name: recipe.name,
        output: recipe.output,
        outputCount: recipe.outputCount,
        category: recipe.category,
        tier: recipe.tier,
        ingredients: recipe.ingredients.map((i) => i.id),
      },
      run,
      returnRate: run.returnRate,
      complete: result.complete,
      missing: result.missing,
      stale: dates.some((d) => isStale(d, now)),
      oldestAt: dates[0] ?? null,
      upfront: result.upfront,
      revenue: result.revenue,
      fees: result.fees,
      profit: result.profit,
      margin: result.margin,
      crafts,
      total: crafts === null || result.profit === null ? null : result.profit * crafts,
    };
  });
  const priced = all.filter((r) => r.complete && r.crafts !== null);
  const ranked = priced
    .filter((r) => r.crafts! > 0)
    .sort(
      (a, b) =>
        b.total! - a.total! || b.margin! - a.margin! || a.recipe.id.localeCompare(b.recipe.id),
    );
  return {
    ranked,
    overBudget: priced.filter((r) => r.crafts === 0),
    unpriced: all.filter((r) => !r.complete),
  };
}
