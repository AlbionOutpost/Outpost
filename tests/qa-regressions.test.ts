import { it, expect } from "vitest";
import { tradeSchema } from "../src/lib/albion/calculations";
it("rejects scenarios whose derived totals exceed finite financial precision", () => {
  expect(
    tradeSchema.safeParse({
      buy: 1e308,
      sell: 1e308,
      quantity: 1000000,
      tax: 100,
      fee: 100,
      transport: 0,
    }).success,
  ).toBe(false);
});

import { sourceTimestamp, isStale } from "../src/lib/albion/freshness";
it("normalizes timezone-less source timestamps to UTC and flags future freshness", () => {
  expect(sourceTimestamp("2026-10-25T02:30:00")).toBe(Date.UTC(2026, 9, 25, 2, 30));
  expect(isStale("2026-10-25T02:30:00", Date.UTC(2026, 9, 25, 2, 0))).toBe(true);
});
