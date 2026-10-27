import { expect, it } from "vitest";
import { recipes } from "../src/lib/albion/recipes";
import { initialProduction, production, estimatedFocusCost } from "../src/lib/albion/production";
it("matches independently reviewed July T4 material counts and base focus", () => {
  const expected = {
    "battleaxe-t4": [1286, { T4_METALBAR: 16, T4_PLANKS: 8 }],
    "broadsword-t4": [1286, { T4_METALBAR: 16, T4_LEATHER: 8 }],
    "bow-t4": [1715, { T4_PLANKS: 32 }],
    "shield-t4": [429, { T4_PLANKS: 4, T4_METALBAR: 4 }],
    "scholar-cowl-t4": [429, { T4_CLOTH: 8 }],
    "mercenary-jacket-t4": [858, { T4_LEATHER: 16 }],
    "mercenary-shoes-t4": [429, { T4_LEATHER: 8 }],
    "bag-t4": [858, { T4_CLOTH: 8, T4_LEATHER: 8 }],
    "cape-t4": [429, { T4_CLOTH: 4, T4_LEATHER: 4 }],
  };
  for (const [id, [focus, materials]] of Object.entries(expected)) {
    const recipe = recipes.find((r) => r.id === id)!;
    expect(recipe.baseFocus).toBe(focus);
    expect(Object.fromEntries(recipe.ingredients.map((i) => [i.id, i.quantity]))).toEqual(
      materials,
    );
    expect(recipe.source).toContain("d72a159ed01ee4645b60d18633cd683779b9adc6");
  }
});
it.each(["americas", "europe", "asia"] as const)(
  "independently prices a three-bow batch in %s",
  (region) => {
    const input = initialProduction("crafting", region);
    input.recipeId = "bow-t4";
    input.batches = 3;
    input.stationFee = 25;
    input.tax = 8;
    input.setupFee = 2.5;
    for (const [id, value] of Object.entries({ T4_PLANKS: 50, T4_2H_BOW: 2500 }))
      input.prices[id] = {
        value,
        manual: true,
        observedAt: null,
        city: null,
        region: null,
        quality: 1,
      };
    // 96 planks × 50 + 3 × 25 = 4875 upfront; 7500 sales - 787.5 fees - 4875 = 1837.5.
    expect(production(input)).toMatchObject({
      upfront: 4875,
      revenue: 7500,
      fees: 787.5,
      profit: 1837.5,
    });
  },
);
it("uses Normal refined-material identity even for legacy saved quality assumptions", () => {
  const input = initialProduction("refining", "asia");
  input.quality = 5;
  for (const [id, value] of Object.entries({ T4_ORE: 100, T3_METALBAR: 25, T4_METALBAR: 500 }))
    input.prices[id] = {
      value,
      manual: true,
      observedAt: null,
      city: null,
      region: null,
      quality: 1,
    };
  expect(production(input).profit).toBe(275);
  input.prices.T4_METALBAR.quality = 5;
  expect(production(input).profit).toBeNull();
});
it("keeps focus units and exponential reduction independent of unknown node coefficients or rounding", () => {
  expect(estimatedFocusCost(1286, 0, 1)).toBe(1286);
  expect(estimatedFocusCost(1286, 10000, 10)).toBe(6430);
  expect(estimatedFocusCost(1286, 20000, 1)).toBe(321.5);
  for (const args of [
    [0, 0, 1],
    [1286, -1, 1],
    [1286, 0, 1.5],
    [1286, Infinity, 1],
  ])
    expect(() => estimatedFocusCost(...(args as [number, number, number]))).toThrow();
});
