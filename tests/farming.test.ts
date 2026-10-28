import { describe, expect, it } from "vitest";
import { farming, farmingSchema, initialFarming } from "@/lib/albion/farming";
function fixture() {
  const v = initialFarming("europe");
  v.plants = 10;
  v.wateredPlants = 5;
  v.harvestPerPlant = 8;
  v.seedPrice.value = 2000;
  v.productPrice.value = 100;
  v.buyFee = 1;
  v.sellFee = 10;
  v.operatingCost = 100;
  v.focus = 500;
  return v;
}
describe("single-harvest farming accounting", () => {
  it("separates cash, expected seed assets and incremental focus benefit", () => {
    // 10 plants, five watered with200% seeds =>10 seeds and80 produce.
    // Cash20300 upfront; sales8000 less800 fees. Cash=-13100; seed assets20000 =>6900 profit.
    const result = farming(fixture());
    expect(result).toMatchObject({
      complete: true,
      expectedSeeds: 10,
      harvest: 80,
      upfront: 20300,
      revenue: 8000,
      fees: 800,
      seedCredit: 20000,
      cashProfit: -13100,
      profit: 6900,
      focusBenefit: 20000,
      incrementalPerFocus: 40,
    });
  });
  it("requires harvest and both prices, while allowing explicit manual zero", () => {
    const v = fixture();
    v.harvestPerPlant = null;
    expect(farming(v).profit).toBeNull();
    v.harvestPerPlant = 8;
    v.productPrice.value = null;
    expect(farming(v).profit).toBeNull();
    v.productPrice.value = 0;
    expect(farming(v).profit).toBe(-300);
  });
  it("rejects wrong observation identities and zero sentinel values without fabricating costs", () => {
    const v = fixture();
    v.seedPrice = {
      value: 2000,
      manual: false,
      quality: 1,
      region: "asia",
      city: "Lymhurst",
      observedAt: new Date().toISOString(),
    };
    expect(farming(v).complete).toBe(false);
    v.seedPrice.region = "europe";
    v.seedPrice.city = "Martlock";
    expect(farming(v).profit).toBeNull();
    v.seedPrice.city = "Lymhurst";
    v.seedPrice.value = 0;
    expect(farming(v).complete).toBe(false);
  });
  it("keeps old prices stale after restore and preserves fractional expected seeds", () => {
    const v = fixture();
    v.wateredPlants = 0;
    v.seedYieldBase = 33;
    v.seedPrice = {
      value: 2000,
      manual: false,
      quality: 1,
      region: "europe",
      city: "Lymhurst",
      observedAt: "2020-01-01T00:00:00Z",
    };
    const r = farming(v);
    expect(r.stale).toBe(true);
    expect(r.expectedSeeds).toBe(3.3);
    expect(r.incrementalPerFocus).toBeNull();
    v.wateredPlants = 5;
    v.focus = 0;
    expect(farming(v).incrementalPerFocus).toBeNull();
  });
  it("bounds watering, quantities, percentages, crop identities and monetary totals", () => {
    const v = fixture();
    v.wateredPlants = 11;
    expect(farmingSchema.safeParse(v).success).toBe(false);
    expect(farmingSchema.safeParse({ ...v, wateredPlants: 0, cropId: "FAKE_CROP" }).success).toBe(
      false,
    );
    v.wateredPlants = 5;
    v.seedPrice.value = 1e12;
    expect(() => farming(v)).toThrow("Farming totals");
  });
});
