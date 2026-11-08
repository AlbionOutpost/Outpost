import { describe, expect, it } from "vitest";
import { initialProduction } from "@/lib/albion/production";
import { productionPlan, productionPlanSchema } from "@/lib/albion/production-plan";
import { gameRecipe } from "@/lib/albion/game/recipes";
import { registerRecipes } from "@/lib/albion/recipes";

function run() {
  const value = initialProduction("crafting", "europe");
  for (const [id, price] of Object.entries({ T4_METALBAR: 100, T4_PLANKS: 50, T4_MAIN_AXE: 3000 }))
    value.prices[id] = {
      value: price,
      manual: true,
      quality: 1,
      region: null,
      city: null,
      observedAt: null,
    };
  value.returns = { T4_METALBAR: true, T4_PLANKS: true };
  value.returnRate = 20;
  value.stationFee = 100;
  value.tax = 10;
  return value;
}
describe("production planning", () => {
  it("keeps tiny plan revenue without exposing an infinite combined margin", () => {
    const value = run();
    value.prices.T4_MAIN_AXE.value = 1e-310;
    const plan = productionPlan({ kind: "production-plan", region: "europe", runs: [value] });
    expect(plan.complete).toBe(true);
    expect(plan.revenue).toBe(1e-310);
    expect(plan.profit).toBe(-1700);
    expect(plan.margin).toBeNull();
  });
  it("aggregates known recipe silver after a saved plan is restored", () => {
    registerRecipes([gameRecipe("T4_WOOD_LEVEL1@1")!]);
    const first = initialProduction("crafting", "europe");
    first.tax = 0; // A no-tax fixture: the hand-worked values below include no sales tax.
    first.recipeId = "T4_WOOD_LEVEL1@1";
    first.batches = 2;
    for (const [id, value] of Object.entries({ T4_WOOD: 100, "T4_WOOD_LEVEL1@1": 1000 }))
      first.prices[id] = {
        value,
        manual: true,
        quality: 1,
        region: null,
        city: null,
        observedAt: null,
      };
    const restored = productionPlanSchema.parse(
      JSON.parse(
        JSON.stringify({
          kind: "production-plan",
          region: "europe",
          runs: [first, { ...first, batches: 3, stationFee: 20 }],
        }),
      ),
    );
    // Five materials cost500, mandatory silver7,500, additional station60, revenue5,000.
    expect(productionPlan(restored)).toMatchObject({
      complete: true,
      recipeCost: 7500,
      stationCost: 60,
      upfront: 8060,
      cost: 8060,
      revenue: 5000,
      profit: -3060,
      cashProfit: -3060,
    });
    const legacy = structuredClone(restored);
    delete legacy.runs[1].recipeSilverAccounting;
    expect(() => productionPlan(legacy)).toThrow("Confirm whether its station fee includes");
  });
  it("aggregates gross purchases separately from returns, cash and economic profit", () => {
    // Two axes: 32 bars at100 +16 planks at50; upfront4200, revenue6000,
    // tax600, retained resources800. Cash profit1200, economic profit2000.
    const plan = productionPlan({
      kind: "production-plan",
      region: "europe",
      runs: [run(), run()],
    });
    expect(plan.materials.map((r) => [r.id, r.quantity, r.gross])).toEqual([
      ["T4_METALBAR", 32, 3200],
      ["T4_PLANKS", 16, 800],
    ]);
    expect(plan).toMatchObject({
      upfront: 4200,
      revenue: 6000,
      fees: 600,
      returnCredit: 800,
      cashProfit: 1200,
      profit: 2000,
      cost: 3400,
      complete: true,
    });
    expect(plan.margin).toBeCloseTo(100 / 3);
  });
  it("keeps differing price assumptions additive and separates purchase markets", () => {
    const second = run();
    second.prices.T4_METALBAR.value = 200;
    const plan = {
      kind: "production-plan" as const,
      region: "europe" as const,
      runs: [run(), second],
    };
    expect(productionPlan(plan).materials[0].gross).toBe(4800);
    second.materialCity = "Martlock";
    expect(productionPlan(plan).materials).toHaveLength(4);
  });
  it("never reports a partial total as full profit or treats missing inputs as zero", () => {
    const second = run();
    delete second.prices.T4_METALBAR;
    const result = productionPlan({
      kind: "production-plan",
      region: "europe",
      runs: [run(), second],
    });
    expect(result.complete).toBe(false);
    expect(result.profit).toBeNull();
    expect(result.upfront).toBeNull();
    expect(result.materials[0].gross).toBeNull();
    expect(result.materials[1].gross).toBe(800);
  });
  it("preserves observation age and rejects mixed servers, empty and oversized plans", () => {
    const value = run();
    value.prices.T4_METALBAR = {
      value: 100,
      manual: false,
      quality: 1,
      region: "europe",
      city: "Lymhurst",
      observedAt: "2020-01-01T00:00:00Z",
    };
    const plan = { kind: "production-plan" as const, region: "europe" as const, runs: [value] };
    expect(productionPlan(plan).stale).toBe(true);
    expect(productionPlan(plan).materials[0].sources).toContain("Observed 2020-01-01T00:00:00Z");
    expect(productionPlanSchema.safeParse({ ...plan, region: "asia" }).success).toBe(false);
    expect(productionPlanSchema.safeParse({ ...plan, runs: [] }).success).toBe(false);
    expect(productionPlanSchema.safeParse({ ...plan, runs: Array(31).fill(value) }).success).toBe(
      false,
    );
  });
  it("bounds combined totals even when individual runs are valid", () => {
    const value = run();
    value.prices.T4_MAIN_AXE.value = 600_000_000_000;
    expect(() =>
      productionPlan({ kind: "production-plan", region: "europe", runs: [value, value] }),
    ).toThrow("Plan totals");
  });
});
