import { z } from "zod";
import { regionSchema } from "./region-config";
import { decimalRatio } from "./decimal";
export const tradeSchema = z
  .object({
    buy: z.number().nonnegative().max(1e12),
    buyMode: z.enum(["instant", "buy-order"]).default("instant"),
    buyFee: z.number().min(0).max(100).default(0),
    sell: z.number().nonnegative().max(1e12),
    quantity: z.number().int().min(1).max(1000000),
    tax: z.number().min(0).max(100),
    fee: z.number().min(0).max(100),
    transport: z.number().nonnegative().max(1e12),
  })
  .superRefine((v, ctx) => {
    if (
      v.buy * v.quantity * (1 + (v.buyMode === "buy-order" ? v.buyFee : 0) / 100) + v.transport >
        1e12 ||
      v.sell * v.quantity > 1e12
    )
      ctx.addIssue({
        code: "custom",
        message: "Scenario cost and revenue must each be at most one trillion silver.",
      });
  });
export const tradeScenarioSchema = tradeSchema.safeExtend({
  kind: z.literal("flipping"),
  region: regionSchema,
});
export function trade(input: z.input<typeof tradeSchema>) {
  const v = tradeSchema.parse(input);
  const purchaseFees = v.buyMode === "buy-order" ? (v.buy * v.quantity * v.buyFee) / 100 : 0;
  const cost = v.buy * v.quantity + purchaseFees + v.transport;
  const revenue = v.sell * v.quantity;
  const fees = revenue * ((v.tax + v.fee) / 100);
  const profit = revenue - cost - fees;
  // Exact decimal ratios for the strict whole-silver boundary; UI threshold is approximate.
  const [buyN, buyD] = decimalRatio(v.buy),
    [transportN, transportD] = decimalRatio(v.transport);
  const [taxN, taxD] = decimalRatio(v.tax),
    [feeN, feeD] = decimalRatio(v.fee);
  const quantity = BigInt(v.quantity);
  const retainedN = 100n * taxD * feeD - taxN * feeD - feeN * taxD;
  const [buyFeeN, buyFeeD] = decimalRatio(v.buyMode === "buy-order" ? v.buyFee : 0);
  const costN =
    buyN * quantity * (100n * buyFeeD + buyFeeN) * transportD + transportN * buyD * 100n * buyFeeD;
  const costD = buyD * 100n * buyFeeD * transportD;
  const thresholdN = costN * 100n * taxD * feeD;
  const thresholdD = costD * quantity * retainedN;
  const feasible = retainedN > 0n && thresholdN * quantity <= 1000000000000n * thresholdD;
  const breakEven = feasible ? Number((thresholdN * 1000000n) / thresholdD) / 1000000 : null;
  const candidate = feasible ? thresholdN / thresholdD + 1n : null;
  const minimumProfitableSale =
    candidate !== null && candidate * quantity <= 1000000000000n ? Number(candidate) : null;
  return {
    breakEven,
    minimumProfitableSale,
    cost,
    purchaseFees,
    revenue,
    fees,
    profit,
    margin: revenue ? (profit / revenue) * 100 : null,
    roi: cost ? (profit / cost) * 100 : null,
  };
}
export function returnedMaterialCost(cost: number, rate: number) {
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(rate) || rate < 0 || rate >= 1)
    throw new Error("Invalid cost or return rate");
  return cost * (1 - rate);
}
