import "server-only";
import { gameRecipesInCategory } from "./game/server-recipes";
import { isSupportedMarketItem } from "./market-supported";
import { productionOutputQuality } from "./production";
import { MAX_SCAN_ITEMS } from "./craft-categories";
import type { MarketPrice } from "./market-quotes";
import type { Recipe } from "./recipes";

/**
 * The craft finder's candidates: primary recipes of one category, tier and enchantment, taken in
 * data order while every item they need (output and materials) fits one bounded price request.
 * Recipes naming an item outside the source catalog are left out rather than priced as missing.
 */
export function craftCandidates(category: string, tier: number, enchantment: number) {
  const all = gameRecipesInCategory(category, tier, enchantment);
  const items = new Set<string>();
  const recipes: Recipe[] = [];
  for (const recipe of all) {
    const ids = [recipe.output, ...recipe.ingredients.map((i) => i.id)];
    if (!ids.every(isSupportedMarketItem)) continue;
    const next = new Set([...items, ...ids]);
    if (next.size > MAX_SCAN_ITEMS) continue;
    ids.forEach((id) => items.add(id));
    recipes.push(recipe);
  }
  return { total: all.length, recipes, items: [...items] };
}

/** Only the rows a craft can use: materials at quality 1, each output at its own sale quality. */
export function craftPriceRows(recipes: Recipe[], quality: number, rows: MarketPrice[]) {
  const wanted = new Set<string>();
  for (const r of recipes) {
    for (const i of r.ingredients) wanted.add(`${i.id}:${i.quality === "selected" ? quality : 1}`);
    wanted.add(
      `${r.output}:${productionOutputQuality({ kind: "crafting", quality, recipeId: r.id })}`,
    );
  }
  return rows.filter(
    (row) =>
      wanted.has(`${row.item_id}:${row.quality}`) &&
      (row.sell_price_min > 0 || row.buy_price_max > 0),
  );
}

/** Black Market board items: each primary recipe's output over a tier range, deduplicated. */
export function gearCandidates(
  category: string,
  fromTier: number,
  toTier: number,
  enchantment: number,
) {
  const seen = new Map<string, { id: string; name: string; tier: number }>();
  for (let tier = fromTier; tier <= toTier; tier++)
    for (const recipe of gameRecipesInCategory(category, tier, enchantment))
      if (!seen.has(recipe.output) && isSupportedMarketItem(recipe.output))
        seen.set(recipe.output, { id: recipe.output, name: recipe.name, tier });
  const all = [...seen.values()];
  return { total: all.length, items: all.slice(0, MAX_SCAN_ITEMS) };
}
