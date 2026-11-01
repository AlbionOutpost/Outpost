import { it, expect } from "vitest";
import { sourcedReturnRates, refiningEfficiency } from "../src/lib/albion/production-profile";
import { estimatedFocusCost, initialProduction, production } from "../src/lib/albion/production";
import { recipes } from "../src/lib/albion/recipes";
it("matches independently evaluated Royal city return fractions, not rounded lookup percentages", () => {
  expect(sourcedReturnRates("refining", "T4_METALBAR", "Thetford").returnRate).toBeCloseTo(
    (100 * 29) / 79,
    10,
  );
  expect(sourcedReturnRates("refining", "T4_METALBAR", "Thetford").focusReturnRate).toBeCloseTo(
    (100 * 117) / 217,
    10,
  );
  expect(sourcedReturnRates("crafting", "T8_MAIN_AXE", "Martlock").returnRate).toBeCloseTo(
    (100 * 33) / 133,
    10,
  );
  expect(sourcedReturnRates("crafting", "T4_MAIN_AXE", "Thetford", 10).returnRate).toBeCloseTo(
    (100 * 7) / 32,
    10,
  );
  expect(() => sourcedReturnRates("refining", "T4_METALBAR", "Black Market")).toThrow();
});
it("computes refining specialization separately from returns and keeps station rounding unknown", () => {
  expect(refiningEfficiency(4, [100, 0, 0, 0, 0])).toBe(28000);
  expect(refiningEfficiency(4, [100, 100, 100, 100, 100])).toBe(40000);
  expect(refiningEfficiency(5, [100, 0, 0, 0, 0])).toBe(3000);
  expect(estimatedFocusCost(54, 40000, 10)).toBe(33.75);
  expect(() => refiningEfficiency(4, [101, 0, 0, 0, 0])).toThrow();
});
it("resolves plain steel and expands only explicit normal recipes with independently checked higher-tier inputs", () => {
  expect(recipes.filter((r) => r.kind === "crafting" && !r.historical)).toHaveLength(45);
  expect(recipes.filter((r) => r.kind === "refining")).toHaveLength(25);
  const steel = recipes.find((r) => r.id === "steel-bar-t4")!;
  expect(steel.source).not.toContain("Pristine");
  expect(steel.baseFocus).toBe(54);
  expect(steel.ingredients.map((i) => [i.id, i.quantity])).toEqual([
    ["T4_ORE", 2],
    ["T3_METALBAR", 1],
  ]);
  const t8 = recipes.find((r) => r.id === "broadsword-t8")!;
  expect(Object.fromEntries(t8.ingredients.map((i) => [i.id, i.quantity]))).toEqual({
    T8_METALBAR: 16,
    T8_LEATHER: 8,
  });
  const input = initialProduction("crafting", "americas");
  input.recipeId = "broadsword-t8";
  input.batches = 2;
  input.stationFee = 100;
  input.tax = 10;
  for (const [id, value] of Object.entries({
    T8_METALBAR: 1000,
    T8_LEATHER: 500,
    T8_MAIN_SWORD: 30000,
  }))
    input.prices[id] = {
      value,
      manual: true,
      observedAt: null,
      region: null,
      city: null,
      quality: 1,
    };
  // 2 × (16,000 + 4,000) + 200 upfront; 60,000 - 6,000 - 40,200 = 13,800.
  expect(production(input)).toMatchObject({
    upfront: 40200,
    revenue: 60000,
    fees: 6000,
    profit: 13800,
  });
});
