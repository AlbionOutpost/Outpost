import { z } from "zod";
import crops from "./farming-crops.json" with { type: "json" };
import { cities, regionSchema } from "./region-config";
import { observation } from "./production";
import { isStale } from "./freshness";
export { crops };
const amount = z.number().min(0).max(1e9).nullable();
export const farmingSchema = z
  .object({
    kind: z.literal("farming"),
    region: regionSchema,
    cropId: z.string().refine((id) => crops.some((crop) => crop.productId === id)),
    materialCity: z.enum(cities),
    outputCity: z.enum(cities),
    plants: z.number().int().min(1).max(100000),
    wateredPlants: z.number().int().min(0).max(100000),
    harvestPerPlant: z.number().min(0).max(1000).nullable(),
    seedYieldBase: z.number().min(0).max(300),
    seedYieldWatered: z.number().min(0).max(300),
    seedPrice: observation,
    productPrice: observation,
    buyFee: z.number().min(0).max(100),
    sellFee: z.number().min(0).max(100),
    operatingCost: z.number().min(0).max(1e12),
    focus: amount,
  })
  .superRefine((v, ctx) => {
    if (v.wateredPlants > v.plants)
      ctx.addIssue({ code: "custom", message: "Watered plants cannot exceed planted seeds" });
  });
export type FarmingInput = z.infer<typeof farmingSchema>;
export function initialFarming(region: FarmingInput["region"]): FarmingInput {
  const empty = {
    value: null,
    manual: true,
    observedAt: null,
    region: null,
    city: null,
    quality: 1,
  };
  return {
    kind: "farming",
    region,
    cropId: "T1_CARROT",
    materialCity: "Lymhurst",
    outputCity: "Lymhurst",
    plants: 9,
    wateredPlants: 0,
    harvestPerPlant: null,
    seedYieldBase: 0,
    seedYieldWatered: 200,
    seedPrice: { ...empty },
    productPrice: { ...empty },
    buyFee: 0,
    sellFee: 0,
    operatingCost: 0,
    focus: null,
  };
}
export function farming(input: FarmingInput) {
  const v = farmingSchema.parse(input);
  const known = (price: FarmingInput["seedPrice"], city: string) =>
    price.value !== null &&
    price.quality === 1 &&
    (price.manual || (price.value > 0 && price.region === v.region && price.city === city));
  const complete =
    known(v.seedPrice, v.materialCity) &&
    known(v.productPrice, v.outputCity) &&
    v.harvestPerPlant !== null;
  const stale = [v.seedPrice, v.productPrice].some(
    (price) => !price.manual && (!price.observedAt || isStale(price.observedAt)),
  );
  const expectedSeeds =
    ((v.plants - v.wateredPlants) * v.seedYieldBase + v.wateredPlants * v.seedYieldWatered) / 100;
  const harvest = v.harvestPerPlant === null ? null : v.plants * v.harvestPerPlant;
  if (!complete)
    return {
      complete,
      stale,
      expectedSeeds,
      harvest,
      upfront: null,
      revenue: null,
      fees: null,
      seedCredit: null,
      cashProfit: null,
      profit: null,
      focusBenefit: null,
      incrementalPerFocus: null,
    };
  const seedCost = v.plants * v.seedPrice.value!,
    purchaseFees = (seedCost * v.buyFee) / 100;
  const upfront = seedCost + purchaseFees + v.operatingCost,
    revenue = harvest! * v.productPrice.value!,
    fees = (revenue * v.sellFee) / 100;
  const seedCredit = expectedSeeds * v.seedPrice.value!,
    cashProfit = revenue - fees - upfront,
    profit = cashProfit + seedCredit;
  const focusBenefit =
    ((v.wateredPlants * (v.seedYieldWatered - v.seedYieldBase)) / 100) * v.seedPrice.value!;
  if ([upfront, revenue, seedCredit, profit].some((n) => !Number.isFinite(n) || Math.abs(n) > 1e12))
    throw new Error("Farming totals exceed one trillion silver");
  return {
    complete,
    stale,
    expectedSeeds,
    harvest,
    upfront,
    revenue,
    fees,
    seedCredit,
    cashProfit,
    profit,
    focusBenefit,
    incrementalPerFocus:
      v.wateredPlants > 0 && v.focus && v.focus > 0 ? focusBenefit / v.focus : null,
  };
}
