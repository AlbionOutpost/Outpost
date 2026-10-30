import { equipmentFamilies, equipmentId, equipmentName } from "./equipment-catalog";
import expandedRecipes from "./expanded-recipes.json" with { type: "json" };
import archivedRecipes from "./archived-production-recipes.json" with { type: "json" };
import upgradeData from "./game/upgrades.json" with { type: "json" };
export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  quality: "normal" | "selected";
  /** false for artifacts, tokens and other inputs the game never returns. */
  returnable?: boolean;
};
export type Recipe = {
  id: string;
  name: string;
  kind: "crafting" | "refining" | "enchanting";
  output: string;
  outputCount: number;
  ingredients: RecipeIngredient[];
  source: string;
  baseFocus?: number;
  category?: "cooking" | "alchemy";
  historical?: boolean;
  tier?: number;
  enchantment?: number;
  craftingCategory?: string;
  silver?: number;
  /** 1 for the primary recipe, 2+ for alternatives (artifact vs token, faction paths). */
  alternative?: number;
};
/** Small bundled set used as defaults and for saved scenarios created before the full game data. */
export const recipes: Recipe[] = [...expandedRecipes, ...archivedRecipes] as Recipe[];
const registry = new Map<string, Recipe>();
let resolver: ((id: string) => Recipe | undefined) | null = null;
/** Client: cache recipes fetched from /api/recipes so the calculator can run them. */
export function registerRecipes(list: Recipe[]) {
  for (const recipe of list) registry.set(recipe.id, recipe);
}
/** Server: resolve any id from the full game data (see game/server-recipes.ts). */
export function setRecipeResolver(fn: (id: string) => Recipe | undefined) {
  resolver = fn;
}
export function findRecipe(id: string): Recipe | undefined {
  return registry.get(id) ?? resolver?.(id) ?? recipes.find((r) => r.id === id);
}
const upgrades = upgradeData.upgrades as unknown as Record<string, [string, number]>;
const upgradeNames = upgradeData.names as Record<string, string>;
/** Upgrade cost to raise `T{tier}_{code}` from `level − 1` to `level`. */
export function upgradeCost(code: string, tier: number, level: number) {
  const row = upgrades[`T${tier}_${code}:${level}`];
  return row ? { id: row[0], name: upgradeNames[row[0]] ?? row[0], quantity: row[1] } : null;
}
/** Artifact Foundry families: rune → soul → relic. Food and potions are enchanted by crafting instead. */
export const enchantable = equipmentFamilies.filter((f) =>
  f.tiers.some((tier) => upgradeCost(f.code, tier, 1)?.id.endsWith("_RUNE")),
);
export function recipeFor(input: {
  kind: string;
  recipeId: string;
  enchantFamily: string;
  tier: number;
  fromEnchant: number;
  toEnchant: number;
}): Recipe {
  if (input.kind !== "enchanting") {
    const recipe = findRecipe(input.recipeId);
    if (!recipe || recipe.kind !== input.kind) throw new Error("Select a supported recipe");
    return recipe;
  }
  const family = enchantable.find((f) => f.code === input.enchantFamily);
  if (!family || !family.tiers.includes(input.tier) || input.fromEnchant >= input.toEnchant)
    throw new Error("Select a valid enchantment path");
  const base = equipmentId(family, input.tier, input.fromEnchant);
  const ingredients: RecipeIngredient[] = [
    { id: base, name: equipmentName(base), quantity: 1, quality: "selected", returnable: false },
  ];
  for (let level = input.fromEnchant + 1; level <= input.toEnchant; level++) {
    const cost = upgradeCost(family.code, input.tier, level);
    if (!cost) throw new Error(`No upgrade from .${level - 1} to .${level} for this item`);
    ingredients.push({
      id: cost.id,
      name: cost.name,
      quantity: cost.quantity,
      quality: "normal",
      returnable: false,
    });
  }
  return {
    id: "enchanting",
    name: `${family.name} · T${input.tier}.${input.fromEnchant} → .${input.toEnchant}`,
    kind: "enchanting",
    output: equipmentId(family, input.tier, input.toEnchant),
    outputCount: 1,
    ingredients,
    tier: input.tier,
    enchantment: input.toEnchant,
    source: "Game item data (upgrade requirements), captured 27 Oct 2026",
  };
}
