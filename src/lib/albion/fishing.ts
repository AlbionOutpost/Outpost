import { z } from "zod";
import { decimalRatio } from "./decimal";
export type FishReference = {
  id: string;
  name: string;
  tier: number;
  choppedPerFish: number;
  historicalFame: number | null;
};
const price = z.number().min(0).max(1e12).nullable();
export const fishConversionInput = z
  .object({
    quantity: z.number().int().min(1).max(1000000),
    choppedPerFish: z.number().int().min(1).max(10000),
    purchasePrice: price,
    rawSalePrice: price,
    choppedSalePrice: price,
    purchaseFee: z.number().min(0).max(100),
    saleFee: z.number().min(0).max(100),
    choppingCost: z.number().min(0).max(1e12),
  })
  .strict();
export function fishConversion(input: z.infer<typeof fishConversionInput>) {
  const v = fishConversionInput.parse(input);
  const quantity = v.quantity * v.choppedPerFish;
  const purchased =
    v.purchasePrice === null ? null : v.quantity * v.purchasePrice * (1 + v.purchaseFee / 100);
  const rawRevenue =
    v.rawSalePrice === null ? null : v.quantity * v.rawSalePrice * (1 - v.saleFee / 100);
  const choppedRevenue =
    v.choppedSalePrice === null ? null : quantity * v.choppedSalePrice * (1 - v.saleFee / 100);
  const upfront = purchased === null ? null : purchased + v.choppingCost;
  for (const value of [purchased, rawRevenue, choppedRevenue, upfront])
    if (value !== null && value > 1e12) throw Error("Scenario exceeds one trillion silver.");
  return {
    quantity,
    upfront,
    rawRevenue,
    choppedRevenue,
    rawProfit: purchased === null || rawRevenue === null ? null : rawRevenue - purchased,
    choppedProfit: upfront === null || choppedRevenue === null ? null : choppedRevenue - upfront,
    advantage:
      rawRevenue === null || choppedRevenue === null
        ? null
        : choppedRevenue - v.choppingCost - rawRevenue,
    costPerChop: upfront === null || quantity === 0 ? null : upfront / quantity,
    breakEven:
      upfront === null || quantity === 0 || v.saleFee === 100
        ? null
        : upfront / (quantity * (1 - v.saleFee / 100)),
  };
}
export const fishFameInput = z
  .object({
    target: z.number().int().min(1).max(1e12),
    famePerFish: z.number().min(0).max(1e9).nullable(),
    purchasePrice: price,
    purchaseFee: z.number().min(0).max(100),
  })
  .strict();
export function fishFame(input: z.infer<typeof fishFameInput>) {
  const v = fishFameInput.parse(input);
  let needed: number | null = null;
  if (v.famePerFish) {
    // Whole fish use the entered decimal ratio: 21 / 0.7 is exactly 30, not 31.
    const [fameN, fameD] = decimalRatio(v.famePerFish);
    needed = Number((BigInt(v.target) * fameD + fameN - 1n) / fameN);
  }
  if (needed !== null && (!Number.isSafeInteger(needed) || needed > 1e9))
    throw Error("The target requires more than one billion fish.");
  const cost =
    needed === null || v.purchasePrice === null
      ? null
      : needed * v.purchasePrice * (1 + v.purchaseFee / 100);
  if (cost !== null && cost > 1e12) throw Error("Scenario exceeds one trillion silver.");
  return {
    needed,
    cost,
    actualFame: needed === null ? null : needed * v.famePerFish!,
    silverPerThousand:
      v.purchasePrice === null || !v.famePerFish
        ? null
        : (v.purchasePrice * (1 + v.purchaseFee / 100) * 1000) / v.famePerFish,
  };
}
