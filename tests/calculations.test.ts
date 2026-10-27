import { describe, it, expect } from "vitest";
import { trade, returnedMaterialCost, tradeScenarioSchema } from "../src/lib/albion/calculations";
import { isStale } from "../src/lib/albion/market-client";
describe("transparent trade arithmetic", () => {
  it("accounts for each expense", () => {
    const r = trade({ buy: 100, sell: 150, quantity: 10, tax: 8, fee: 2.5, transport: 50 });
    expect(r.cost).toBe(1050);
    expect(r.fees).toBe(157.5);
    expect(r.profit).toBe(292.5);
    expect(r.margin).toBeCloseTo(19.5);
  });
  it("handles zero denominators", () => {
    expect(trade({ buy: 0, sell: 0, quantity: 1, tax: 0, fee: 0, transport: 0 }).roi).toBeNull();
  });
  it("rejects negative costs and fractional quantities", () => {
    expect(() => trade({ buy: -1, sell: 2, quantity: 1, tax: 0, fee: 0, transport: 0 })).toThrow();
    expect(() => trade({ buy: 1, sell: 2, quantity: 1.5, tax: 0, fee: 0, transport: 0 })).toThrow();
  });
  it("applies a manually specified return fraction", () => {
    expect(returnedMaterialCost(1000, 0.4)).toBe(600);
    expect(() => returnedMaterialCost(1000, 1)).toThrow();
  });
  it("identifies stale and invalid observations", () => {
    expect(isStale("0001-01-01T00:00:00")).toBe(true);
    expect(isStale("invalid")).toBe(true);
    expect(isStale(new Date().toISOString())).toBe(false);
  });
});

describe("independent trade sale thresholds", () => {
  it("requires106 after a105 exact break-even", () => {
    const r = trade({ buy: 100, sell: 150, quantity: 10, tax: 0, fee: 0, transport: 50 });
    expect(r.breakEven).toBe(105);
    expect(r.minimumProfitableSale).toBe(106);
  });
  it("includes supplied fees and one-time cargo expense", () => {
    const r = trade({ buy: 100, sell: 150, quantity: 10, tax: 8, fee: 2.5, transport: 50 });
    expect(r.breakEven).toBeCloseTo(117.318435754);
    expect(r.minimumProfitableSale).toBe(118);
    expect(
      trade({ buy: 100, sell: 117, quantity: 10, tax: 8, fee: 2.5, transport: 50 }).profit,
    ).toBeCloseTo(-2.85);
    expect(
      trade({ buy: 100, sell: 118, quantity: 10, tax: 8, fee: 2.5, transport: 50 }).profit,
    ).toBeCloseTo(6.1);
  });
  it("does not suggest profitable thresholds with100 percent fees", () => {
    expect(
      trade({ buy: 100, sell: 150, quantity: 10, tax: 100, fee: 0, transport: 0 })
        .minimumProfitableSale,
    ).toBeNull();
  });
  it("handles free input without pretending zero sale is positive profit", () => {
    const r = trade({ buy: 0, sell: 0, quantity: 1, tax: 0, fee: 0, transport: 0 });
    expect(r.breakEven).toBe(0);
    expect(r.minimumProfitableSale).toBe(1);
  });
  it("respects model revenue bounds for thresholds", () => {
    const r = trade({ buy: 1e12, sell: 1e12, quantity: 1, tax: 99, fee: 0, transport: 0 });
    expect(r.breakEven).toBeNull();
    expect(r.minimumProfitableSale).toBeNull();
  });
});

it("does not round a near-integer high-value threshold into an infeasible extra silver", () => {
  const r = trade({
    buy: 999999999999.9999,
    sell: 1e12,
    quantity: 1,
    tax: 0,
    fee: 0,
    transport: 0,
  });
  expect(r.minimumProfitableSale).toBe(1e12);
  expect(
    trade({ buy: 5e-324, sell: 1, quantity: 1, tax: 0, fee: 0, transport: 0 })
      .minimumProfitableSale,
  ).toBe(1);
});

it("saved trade schema preserves financial bounds and validates region", () => {
  const valid = {
    kind: "flipping",
    region: "europe",
    buy: 100,
    sell: 150,
    quantity: 10,
    tax: 8,
    fee: 2.5,
    transport: 50,
  };
  expect(tradeScenarioSchema.safeParse(valid).success).toBe(true);
  expect(tradeScenarioSchema.safeParse({ ...valid, buy: 1e12 }).success).toBe(false);
  expect(tradeScenarioSchema.safeParse({ ...valid, region: "invalid" }).success).toBe(false);
});

it("includes one supplied buy-order setup charge in cost profit and exact sale threshold", () => {
  const input = {
    buy: 100,
    sell: 150,
    quantity: 10,
    tax: 8,
    fee: 2.5,
    transport: 50,
    buyMode: "buy-order" as const,
    buyFee: 2.5,
  };
  const result = trade(input);
  expect(result.purchaseFees).toBe(25);
  expect(result.cost).toBe(1075);
  expect(result.profit).toBe(267.5);
  expect(result.breakEven).toBeCloseTo(120.111731);
  expect(result.minimumProfitableSale).toBe(121);
  expect(trade({ ...input, sell: 120 }).profit).toBeCloseTo(-1);
  expect(trade({ ...input, sell: 121 }).profit).toBeCloseTo(7.95);
  expect(trade({ ...input, buyMode: "instant" }).purchaseFees).toBe(0);
});
it("restores legacy trade inputs with zero purchase fee and rejects invalid purchase costs", () => {
  const valid = { buy: 100, sell: 150, quantity: 1, tax: 0, fee: 0, transport: 0 };
  expect(tradeScenarioSchema.parse({ ...valid, kind: "flipping", region: "asia" })).toMatchObject({
    buyMode: "instant",
    buyFee: 0,
  });
  expect(() => trade({ ...valid, buyMode: "buy-order", buyFee: -1 })).toThrow();
  expect(() => trade({ ...valid, buy: 1e12, buyMode: "buy-order", buyFee: 1 })).toThrow();
});
