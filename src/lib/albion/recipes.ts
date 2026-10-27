import { equipmentFamilies, equipmentId, equipmentName } from "./equipment-catalog";
import expandedRecipes from "./expanded-recipes.json" with { type: "json" };
export type Recipe = {
  id: string;
  name: string;
  kind: "crafting" | "refining" | "enchanting";
  output: string;
  outputCount: number;
  ingredients: { id: string; name: string; quantity: number; quality: "normal" | "selected" }[];
  source: string;
  baseFocus?: number;
};
export const recipes: Recipe[] = expandedRecipes as Recipe[];
export const enchantable = equipmentFamilies.filter((f) =>
  [
    "MAIN_AXE",
    "OFF_SHIELD",
    "HEAD_CLOTH_SET1",
    "ARMOR_LEATHER_SET1",
    "SHOES_LEATHER_SET1",
    "CAPE",
    "BAG",
  ].includes(f.code),
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
    const recipe = recipes.find((r) => r.id === input.recipeId && r.kind === input.kind);
    if (!recipe) throw new Error("Select a supported recipe");
    return recipe;
  }
  const family = enchantable.find((f) => f.code === input.enchantFamily);
  if (!family || !family.tiers.includes(input.tier) || input.fromEnchant >= input.toEnchant)
    throw new Error("Select a valid enchantment path");
  const count =
    family.slot === "Main hand" ? 288 : ["Chest", "Bag"].includes(family.slot) ? 192 : 96;
  const base = equipmentId(family, input.tier, input.fromEnchant);
  const ingredients: Recipe["ingredients"] = [
    { id: base, name: equipmentName(base), quantity: 1, quality: "selected" },
  ];
  for (let step = input.fromEnchant; step < input.toEnchant; step++) {
    const material = ["RUNE", "SOUL", "RELIC"][step];
    if (!material) throw new Error("Artifact Foundry upgrades support .0 through .3 only");
    ingredients.push({
      id: `T${input.tier}_${material}`,
      name: `T${input.tier} ${material.toLowerCase()}`,
      quantity: count,
      quality: "normal",
    });
  }
  return {
    id: "enchanting",
    name: `${family.name} · T${input.tier}.${input.fromEnchant} → .${input.toEnchant}`,
    kind: "enchanting",
    output: equipmentId(family, input.tier, input.toEnchant),
    outputCount: 1,
    ingredients,
    source: "https://wiki.albiononline.com/wiki/Expert%27s_Rune",
  };
}
