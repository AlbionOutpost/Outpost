import { describe, expect, it } from "vitest";
import {
  initialProduction,
  production,
  productionSchema,
  productionOutputQuality,
  returnRateFromBonus,
} from "@/lib/albion/production";
import { recipeFor } from "@/lib/albion/recipes";
function scenario() {
  const v = initialProduction("crafting", "europe");
  for (const [id, value] of Object.entries({ T4_METALBAR: 100, T4_PLANKS: 50, T4_MAIN_AXE: 3000 }))
    v.prices[id] = { value, manual: true, observedAt: null, region: null, city: null, quality: 1 };
  v.returns = { T4_METALBAR: true, T4_PLANKS: true };
  v.returnRate = 20;
  v.stationFee = 100;
  v.tax = 10;
  return v;
}
describe("production economics", () => {
  it("warns on undated, invalid, old and future source observations without flagging manual prices", () => {
    const v = scenario();
    const source = {
      ...v.prices.T4_METALBAR,
      manual: false,
      region: v.region,
      city: v.materialCity,
    };
    for (const observedAt of [null, "", "invalid", "0001-01-01T00:00:00", "2099-01-01T00:00:00Z"]) {
      v.prices.T4_METALBAR = { ...source, observedAt };
      expect(production(v).stale, `timestamp ${observedAt}`).toBe(true);
      expect(production(v).profit).toBe(1000);
    }
    v.prices.T4_METALBAR = { ...source, observedAt: new Date().toISOString() };
    expect(production(v).stale).toBe(false);
    v.prices.T4_METALBAR = { ...source, manual: true, observedAt: null };
    expect(production(v).stale).toBe(false);
  });
  it("distinguishes a missing source-price sentinel from an intentional zero override", () => {
    const v = scenario();
    v.prices.T4_MAIN_AXE = {
      value: 0,
      manual: false,
      quality: 1,
      region: v.region,
      city: v.outputCity,
      observedAt: new Date().toISOString(),
    };
    expect(production(v).complete).toBe(false);
    expect(production(v).missing).toContain("T4_MAIN_AXE");
    v.prices.T4_MAIN_AXE.manual = true;
    expect(production(v).profit).toBe(-1700);
  });
  it("separates cash profit from the value of returned resources", () => {
    const r = production(scenario());
    expect(r.complete).toBe(true);
    expect(r.upfront).toBe(2100);
    expect(r.grossMaterials).toBe(2000);
    expect(r.stationCost).toBe(100);
    expect(r.profitPerItem).toBe(1000);
    expect(r.returnCredit).toBe(400);
    expect(r.cost).toBe(1700);
    expect(r.fees).toBe(300);
    expect(r.profit).toBe(1000);
    expect(r.cashProfit).toBe(600);
    expect(r.roi).toBeCloseTo((1000 / 1700) * 100);
  });
  it("reports incremental focus value against the non-focus scenario", () => {
    const v = scenario();
    v.useFocus = true;
    v.focusReturnRate = 40;
    v.focusUsed = 100;
    const r = production(v);
    expect(r.profit).toBe(1400);
    expect(r.incrementalPerFocus).toBe(4);
    expect(r.profitPerFocus).toBe(14);
  });
  it("never substitutes missing or mismatched source prices", () => {
    const v = scenario();
    v.prices.T4_METALBAR = {
      value: 100,
      manual: false,
      observedAt: new Date().toISOString(),
      region: "asia",
      city: "Lymhurst",
      quality: 1,
    };
    expect(production(v).profit).toBeNull();
    v.prices.T4_METALBAR.region = "europe";
    v.prices.T4_METALBAR.city = "Caerleon";
    expect(production(v).profit).toBeNull();
    v.prices.T4_METALBAR.city = "Lymhurst";
    expect(production(v).complete).toBe(true);
    v.prices.T4_METALBAR.value = null;
    expect(production(v).complete).toBe(false);
  });
  it("accepts explicitly entered zero and rejects invalid quantities and overflow", () => {
    const v = scenario();
    v.prices.T4_MAIN_AXE.value = 0;
    expect(production(v).profit).toBe(-1700);
    v.batches = 0;
    expect(productionSchema.safeParse(v).success).toBe(false);
    v.batches = 100000;
    v.prices.T4_MAIN_AXE.value = 1e12;
    expect(() => production(v)).toThrow(/trillion/);
  });
  it("uses the documented bonus conversion and enchanting material counts", () => {
    expect(returnRateFromBonus(18)).toBeCloseTo(1 - 1 / 1.18);
    expect(returnRateFromBonus(58)).toBeCloseTo(1 - 1 / 1.58);
    const v = initialProduction("enchanting", "europe");
    v.toEnchant = 3;
    expect(
      recipeFor(v)
        .ingredients.slice(1)
        .map((i) => i.quantity),
    ).toEqual([288, 288, 288]);
    v.returns.T4_MAIN_AXE = true;
    expect(productionSchema.safeParse(v).success).toBe(false);
  });
  it("refining requires both raw and lower-tier ingredients", () => {
    const v = initialProduction("refining", "europe");
    expect(recipeFor(v).ingredients.map((i) => [i.id, i.quantity])).toEqual([
      ["T4_ORE", 2],
      ["T3_METALBAR", 1],
    ]);
    expect(production(v).profit).toBeNull();
  });
  it("independently prices a ten-batch steel scenario with per-ingredient returns", () => {
    const v = initialProduction("refining", "europe");
    v.batches = 10;
    v.stationFee = 10;
    v.tax = 8;
    v.setupFee = 2.5;
    for (const [id, value] of Object.entries({ T4_ORE: 100, T3_METALBAR: 25, T4_METALBAR: 500 }))
      v.prices[id] = {
        value,
        manual: true,
        observedAt: null,
        region: null,
        city: null,
        quality: 1,
      };
    // 20×100 + 10×25 + 10×10 = 2,350 cash; 5,000 sales minus525 fees.
    expect(production(v).profit).toBe(2125);
    expect(production(v).upfront).toBe(2350);
    expect(production(v).fees).toBe(525);
    v.returnRate = 20;
    v.returns.T4_ORE = true;
    expect(production(v).returnCredit).toBe(400);
    expect(production(v).profit).toBe(2525);
    expect(production(v).cashProfit).toBe(2125);
  });
  it("independently prices a two-item quality-preserving enchantment scenario", () => {
    const v = initialProduction("enchanting", "asia");
    v.batches = 2;
    v.quality = 2;
    v.stationFee = 50;
    v.tax = 10;
    for (const [id, value] of Object.entries({
      T4_MAIN_AXE: 2000,
      T4_RUNE: 3,
      "T4_MAIN_AXE@1": 4000,
    }))
      v.prices[id] = {
        value,
        manual: true,
        observedAt: null,
        region: null,
        city: null,
        quality: id === "T4_RUNE" ? 1 : 2,
      };
    // Two bases4,000 +576 runes1,728 +100 station;8,000 sales minus800 tax.
    const result = production(v);
    expect(result.upfront).toBe(5828);
    expect(result.outputQuantity).toBe(2);
    expect(result.fees).toBe(800);
    expect(result.profit).toBe(1372);
    expect(result.profitPerItem).toBe(686);
    v.prices.T4_RUNE.quality = 2;
    expect(production(v).profit).toBeNull();
  });
  it("preserves enchantment output quality regardless of the unused crafting recipe selection", () => {
    const v = initialProduction("enchanting", "europe");
    v.recipeId = "grind-t4_butter";
    v.quality = 2;
    for (const [id, value] of Object.entries({
      T4_MAIN_AXE: 2000,
      T4_RUNE: 3,
      "T4_MAIN_AXE@1": 4000,
    }))
      v.prices[id] = {
        value,
        manual: true,
        observedAt: null,
        region: null,
        city: null,
        quality: id === "T4_RUNE" ? 1 : 2,
      };
    // A cooking tab's saved recipeId must not make selected-quality equipment Normal.
    // One item: 4,000 sale - 2,000 base - 288 × 3 runes = 1,136 silver.
    expect(productionOutputQuality(v)).toBe(2);
    expect(production(v).profit).toBe(1136);
    v.prices["T4_MAIN_AXE@1"].quality = 1;
    expect(production(v).profit).toBeNull();
  });
});
