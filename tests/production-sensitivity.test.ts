import { describe, expect, it } from "vitest";
import { initialProduction } from "@/lib/albion/production";
import { productionSensitivity } from "@/lib/albion/production-sensitivity";
function fixture() {
  const input = initialProduction("crafting", "europe");
  for (const [id, value] of Object.entries({
    T4_METALBAR: 100,
    T4_PLANKS: 50,
    T4_MAIN_AXE: 3000,
  })) {
    input.prices[id] = {
      value,
      manual: true,
      observedAt: null,
      region: null,
      city: null,
      quality: 1,
    };
  }
  input.returns = { T4_METALBAR: true, T4_PLANKS: true };
  input.returnRate = 20;
  input.stationFee = 100;
  input.tax = 10;
  return input;
}
describe("production sale sensitivity", () => {
  it("uses hypothetical sale prices and keeps retained returns separate from cash", () => {
    // 2000 materials -400 returns +100 station; sale net=price*0.9.
    // Prices2400,2700,3000,3300,3600 => net2160..3240 minus1700economic /2100cash.
    const input = fixture();
    const before = structuredClone(input);
    expect(productionSensitivity(input)).toEqual([
      { percent: 80, price: 2400, profit: 460, cashProfit: 60 },
      { percent: 90, price: 2700, profit: 730, cashProfit: 330 },
      { percent: 100, price: 3000, profit: 1000, cashProfit: 600 },
      { percent: 110, price: 3300, profit: 1270, cashProfit: 870 },
      { percent: 120, price: 3600, profit: 1540, cashProfit: 1140 },
    ]);
    expect(input).toEqual(before);
  });
  it("does not generate scenarios for incomplete or wrong-server prices", () => {
    expect(productionSensitivity(initialProduction("crafting", "europe"))).toEqual([]);
    const input = fixture();
    input.prices.T4_METALBAR = {
      ...input.prices.T4_METALBAR,
      manual: false,
      region: "asia",
      city: "Lymhurst",
    };
    expect(productionSensitivity(input)).toEqual([]);
  });
  it("preserves negative profit and scales the entire run", () => {
    const input = fixture();
    input.batches = 10;
    input.prices.T4_MAIN_AXE.value = 1000;
    const rows = productionSensitivity(input);
    expect(rows[2]).toMatchObject({ price: 1000, profit: -8000, cashProfit: -12000 });
  });
  it("keeps invalid configuration editable without generating a chart", () => {
    const input = fixture();
    input.batches = 0;
    expect(productionSensitivity(input)).toEqual([]);
  });
  it("does not crash when a hypothetical result exceeds the calculation bounds", () => {
    const input = fixture();
    input.prices.T4_MAIN_AXE.value = 1e12;
    expect(productionSensitivity(input).at(-1)).toMatchObject({ profit: null, cashProfit: null });
  });
});
