import { expect, it } from "vitest";
import {
  gameRecipe,
  gameRecipesForOutput,
  searchGameRecipes,
  itemWeight,
} from "../src/lib/albion/game/recipes";
import { recipeFor, setRecipeResolver, upgradeCost, enchantable } from "../src/lib/albion/recipes";
import { initialProduction, production, productionSchema } from "../src/lib/albion/production";
import { sourcedReturnRates, specialtyCity } from "../src/lib/albion/production-profile";
import { focusEfficiency, focusPerCraft, focusSpecsFor } from "../src/lib/albion/focus";

setRecipeResolver(gameRecipe);
const manual = (value: number) => ({
  value,
  manual: true,
  observedAt: null,
  city: null,
  region: null,
  quality: 1,
});

it("matches the independently reviewed T4 Battleaxe recipe", () => {
  const axe = gameRecipe("T4_MAIN_AXE")!;
  expect(axe.baseFocus).toBe(1286);
  expect(Object.fromEntries(axe.ingredients.map((i) => [i.id, i.quantity]))).toEqual({
    T4_METALBAR: 16,
    T4_PLANKS: 8,
  });
});

it("keeps enchanted resource identities in market format", () => {
  const axe = gameRecipe("T4_MAIN_AXE@2")!;
  expect(axe.ingredients.map((i) => i.id).sort()).toEqual([
    "T4_METALBAR_LEVEL2@2",
    "T4_PLANKS_LEVEL2@2",
  ]);
  expect(axe.enchantment).toBe(2);
});

it("lists artifact and token alternatives and never returns the artifact", () => {
  const options = gameRecipesForOutput("T8_2H_BOW_HELL");
  expect(options.map((o) => o.id)).toEqual(["T8_2H_BOW_HELL", "T8_2H_BOW_HELL~2"]);
  const artifact = options[0].ingredients.find((i) => i.id === "T8_ARTEFACT_2H_BOW_HELL")!;
  expect(artifact.returnable).toBe(false);
  expect(options[0].ingredients.find((i) => i.id === "T8_PLANKS")!.returnable).toBeUndefined();
});

it("includes refining with the previous tier and faction-token paths", () => {
  const [plain, faction] = gameRecipesForOutput("T5_PLANKS");
  expect(plain.kind).toBe("refining");
  expect(Object.fromEntries(plain.ingredients.map((i) => [i.id, i.quantity]))).toEqual({
    T5_WOOD: 3,
    T4_PLANKS: 1,
  });
  expect(faction.ingredients.some((i) => i.id === "T1_FACTION_FOREST_TOKEN_1")).toBe(true);
});

it("crafts potions in batches of five", () => {
  const potion = gameRecipe("T6_POTION_HEAL")!;
  expect(potion.category).toBe("alchemy");
  expect(potion.outputCount).toBe(5);
});

it("searches by name within a kind, tier and category", () => {
  const found = searchGameRecipes({
    kind: "crafting",
    category: "equipment",
    q: "battleaxe",
    tier: 4,
  });
  expect(found.recipes.map((r) => r.id)).toContain("T4_MAIN_AXE");
  expect(found.recipes.every((r) => r.tier === 4 && !r.category)).toBe(true);
  expect(searchGameRecipes({ kind: "refining", q: "battleaxe" }).total).toBe(0);
});

it("prices an artifact recipe without crediting returns on the artifact", () => {
  const input = initialProduction("crafting", "europe");
  input.recipeId = "T8_2H_BOW_HELL";
  input.returnRate = 50;
  input.returns = { T8_PLANKS: true, T8_ARTEFACT_2H_BOW_HELL: true };
  input.prices = {
    T8_PLANKS: manual(100),
    T8_ARTEFACT_2H_BOW_HELL: manual(10000),
    T8_2H_BOW_HELL: manual(20000),
  };
  // 32 planks × 100 = 3,200 (half returned = 1,600 credit); artifact 10,000 has no credit.
  expect(production(input)).toMatchObject({
    grossMaterials: 13200,
    returnCredit: 1600,
    profit: 8400,
  });
});

it("includes fixed recipe silver in scaled and restored cash and profit, separately from station fees", () => {
  const input = initialProduction("crafting", "europe");
  input.recipeId = "T4_WOOD_LEVEL1@1";
  input.batches = 10;
  input.stationFee = 20;
  input.prices = { T4_WOOD: manual(100), "T4_WOOD_LEVEL1@1": manual(1000) };
  // Ten conversions: 1,000 materials + 15,000 fixed recipe silver + 200 station.
  // Revenue 10,000 => cash/economic loss 6,200; fixed silver receives no returns.
  input.returnRate = 50;
  input.returns = { T4_WOOD: true };
  expect(gameRecipe(input.recipeId)?.silver).toBe(1500);
  expect(production(productionSchema.parse(JSON.parse(JSON.stringify(input))))).toMatchObject({
    complete: true,
    grossMaterials: 1000,
    recipeCost: 15000,
    stationCost: 200,
    upfront: 16200,
    returnCredit: 0,
    cost: 16200,
    revenue: 10000,
    profit: -6200,
    cashProfit: -6200,
  });
  delete input.prices.T4_WOOD;
  expect(production(input)).toMatchObject({
    complete: false,
    recipeCost: 15000,
    upfront: null,
    profit: null,
  });
});

it("includes mandatory silver when enforcing the production cash limit", () => {
  const input = initialProduction("crafting", "europe");
  input.recipeId = "T4_WOOD_LEVEL1@1";
  input.batches = 100000;
  input.stationFee = 10000000;
  // Station fees alone equal the cap; the additional 150m recipe silver exceeds it.
  expect(() => production(input)).toThrow("Scenario totals exceed one trillion silver");
});

it("requires an explicit accounting choice for ambiguous legacy saved fees", () => {
  const input = initialProduction("crafting", "europe");
  input.recipeId = "T4_WOOD_LEVEL1@1";
  input.stationFee = 1520;
  input.prices = { T4_WOOD: manual(100), "T4_WOOD_LEVEL1@1": manual(1000) };
  delete input.recipeSilverAccounting;
  const original = structuredClone(input);
  expect(() => production(input)).toThrow("Confirm whether its station fee includes");
  expect(input).toEqual(original);
  expect(production({ ...input, recipeSilverAccounting: "separate" })).toMatchObject({
    upfront: 3120,
    profit: -2120,
  });
  expect(
    production({ ...input, recipeSilverAccounting: "separate", stationFee: 20 }),
  ).toMatchObject({ upfront: 1620, profit: -620 });
  // A legacy zero fee is unambiguous: the fixed requirement must still be charged.
  expect(production({ ...input, stationFee: 0 })).toMatchObject({ upfront: 1600, profit: -600 });
});

it("uses the game upgrade costs for every slot", () => {
  expect(upgradeCost("2H_BOW", 4, 1)).toMatchObject({ id: "T4_RUNE", quantity: 384 });
  expect(upgradeCost("MAIN_AXE", 6, 2)).toMatchObject({ id: "T6_SOUL", quantity: 288 });
  expect(upgradeCost("ARMOR_PLATE_SET1", 5, 3)).toMatchObject({ id: "T5_RELIC", quantity: 192 });
  expect(upgradeCost("HEAD_PLATE_SET1", 8, 1)).toMatchObject({ quantity: 96 });
  expect(upgradeCost("MAIN_AXE", 4, 4)).toBeNull();
  expect(enchantable.length).toBeGreaterThan(100);
  const bow = recipeFor({
    kind: "enchanting",
    recipeId: "",
    enchantFamily: "2H_BOW",
    tier: 4,
    fromEnchant: 0,
    toEnchant: 2,
  });
  expect(bow.ingredients.map((i) => [i.id, i.quantity])).toEqual([
    ["T4_2H_BOW", 1],
    ["T4_RUNE", 384],
    ["T4_SOUL", 384],
  ]);
});

it("applies the local production bonus table, including Brecilien and Caerleon", () => {
  expect(specialtyCity("crafting", "bag")).toBe("Brecilien");
  expect(specialtyCity("crafting", "shapeshifterstaff")).toBe("Caerleon");
  expect(specialtyCity("refining", "ore")).toBe("Thetford");
  // 18 + 15 = 33 → 33/133; with focus 92/192.
  const bag = sourcedReturnRates("crafting", "T4_BAG", "Brecilien", 0, "bag-t4");
  expect(bag.returnRate).toBeCloseTo((100 * 33) / 133, 10);
  expect(bag.focusReturnRate).toBeCloseTo((100 * 92) / 192, 10);
  expect(sourcedReturnRates("crafting", "T4_BAG", "Lymhurst", 10, "bag-t4").bonus).toBe(28);
  expect(
    sourcedReturnRates("crafting", "T6_POTION_HEAL", "Brecilien", 0, "T6_POTION_HEAL").bonus,
  ).toBe(33);
});

it("reduces focus from specialization levels", () => {
  expect(focusSpecsFor("T4_MAIN_AXE").map((s) => s.specId)).toContain("axe_crafting_specialist");
  // Mastery 100 × 30 + axe specialist 100 × (30 + 250) = 31,000 efficiency.
  const efficiency = focusEfficiency("T4_MAIN_AXE", {
    battleaxe_crafter_mastery: 100,
    axe_crafting_specialist: 100,
  });
  expect(efficiency).toBe(31000);
  expect(focusPerCraft(1286, efficiency)).toBeCloseTo(1286 / 2 ** 3.1, 9);
  // T5 ore smelter spec does nothing for a T4 bar beyond the shared 30 per level.
  expect(focusEfficiency("T4_METALBAR", { expert_ore_smelter: 100 })).toBe(3000);
  expect(() => focusEfficiency("T4_MAIN_AXE", { axe_crafting_specialist: 101 })).toThrow();
});

it("knows item weights for transport", () => {
  expect(itemWeight("T4_METALBAR")).toBeGreaterThan(0);
  expect(itemWeight("T4_MAIN_AXE")).toBe(5.1);
});
