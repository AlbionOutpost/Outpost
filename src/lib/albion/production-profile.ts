import { z } from "zod";
import bonusData from "./game/production-bonuses.json" with { type: "json" };
import { findRecipe } from "./recipes";
export const productionCities = [
  "Bridgewatch",
  "Martlock",
  "Lymhurst",
  "Fort Sterling",
  "Thetford",
  "Caerleon",
  "Brecilien",
] as const;
export const mechanicsProfile = z.object({
  // wiki-84429 profiles were saved before the full city table; both use the same formula.
  version: z.enum(["wiki-84429", "grind-20261027"]),
  city: z.enum(productionCities),
  dailyBonus: z.union([z.literal(0), z.literal(10), z.literal(20)]),
  refiningLevels: z.array(z.number().int().min(0).max(100)).length(5),
});
export type MechanicsProfile = z.infer<typeof mechanicsProfile>;
export const returnProfileSource =
  "Local production bonuses table, albiononlinegrind.com archive 27 Oct 2026";
export const refiningSpecSource = "https://wiki.albiononline.com/wiki/Specializations#Refining";
const bonuses = bonusData as {
  crafting: Record<string, string>;
  refining: Record<string, string>;
  butchering: Record<string, string>;
  efficiency: {
    base: number;
    crafting: number;
    refining: number;
    butchering: number;
    focus: number;
  };
};
/** Crafting categories for the bundled legacy recipes, which predate per-recipe categories. */
const legacyCategory: Record<string, string> = {
  MAIN_AXE: "axe",
  MAIN_SWORD: "sword",
  "2H_BOW": "bow",
  OFF_SHIELD: "offhand",
  HEAD_CLOTH_SET1: "cloth_helmet",
  ARMOR_LEATHER_SET1: "leather_armor",
  SHOES_LEATHER_SET1: "leather_shoes",
  BAG: "bag",
  CAPE: "cape",
  METALBAR: "ore",
  PLANKS: "wood",
  CLOTH: "fiber",
  LEATHER: "hide",
  STONEBLOCK: "rock",
};
export function craftingCategoryOf(output: string, recipeId?: string) {
  const recipe = recipeId ? findRecipe(recipeId) : undefined;
  if (recipe?.craftingCategory) return recipe.craftingCategory;
  const code = /^T[1-8]_(.+?)(?:_LEVEL\d)?(?:@\d)?$/.exec(output)?.[1];
  return code ? legacyCategory[code] : undefined;
}
/** City that holds the local production bonus for this category, if any. */
export function specialtyCity(kind: "crafting" | "refining", category: string | undefined) {
  if (!category) return undefined;
  if (kind === "refining") return bonuses.refining[category];
  return bonuses.crafting[category] ?? bonuses.butchering[category];
}
/** Return % = efficiency / (100 + efficiency); focus adds 59 efficiency. No event or hideout bonuses. */
export function sourcedReturnRates(
  kind: "crafting" | "refining",
  output: string,
  city: string,
  dailyBonus = 0,
  recipeId?: string,
) {
  if (
    !productionCities.includes(city as (typeof productionCities)[number]) ||
    ![0, 10, 20].includes(dailyBonus)
  )
    throw Error("Choose a royal city and a daily bonus of 0, 10 or 20");
  const category = craftingCategoryOf(output, recipeId);
  if (!category) throw Error("No production category is known for this item");
  if (kind === "refining" && !bonuses.refining[category])
    throw Error("Profile does not cover this refined resource");
  const e = bonuses.efficiency;
  const special =
    specialtyCity(kind, category) === city
      ? kind === "refining"
        ? e.refining
        : bonuses.crafting[category]
          ? e.crafting
          : e.butchering
      : 0;
  const bonus = e.base + special + dailyBonus;
  return {
    bonus,
    specialtyCity: specialtyCity(kind, category) ?? null,
    returnRate: (100 * bonus) / (100 + bonus),
    focusReturnRate: (100 * (bonus + e.focus)) / (100 + bonus + e.focus),
  };
}
/** Five T4–T8 nodes: 30 shared FCE per level, plus 250 per level of the selected tier. */
export function refiningEfficiency(tier: number, levels: number[]) {
  if (
    !Number.isInteger(tier) ||
    tier < 4 ||
    tier > 8 ||
    levels.length !== 5 ||
    levels.some((v) => !Number.isInteger(v) || v < 0 || v > 100)
  )
    throw Error("Enter five T4–T8 specialization levels from 0 to 100");
  return 30 * levels.reduce((a, b) => a + b, 0) + 250 * levels[tier - 4];
}
