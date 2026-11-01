import { expect, it } from "vitest";
import { sumObservedCosts } from "@/lib/albion/observed-costs";

it("sums exact whole-silver source prices and replacement sets", () => {
  expect(sumObservedCosts([100, 250])).toBe(350);
  expect(sumObservedCosts([100, 250], 3)).toBe(1050);
  expect(sumObservedCosts([0], 1000)).toBe(0);
  expect(sumObservedCosts([])).toBe(0);
});
it("rejects multiplication and addition before either leaves the safe integer range", () => {
  // 3 × 9,007,199,254,740,991 = 27,021,597,764,222,973, outside exact Number integers.
  expect(
    sumObservedCosts([Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]),
  ).toBeNull();
  expect(sumObservedCosts([Number.MAX_SAFE_INTEGER], 2)).toBeNull();
  expect(sumObservedCosts([4_503_599_627_370_495], 2)).toBe(9_007_199_254_740_990);
  expect(sumObservedCosts([Number.MAX_SAFE_INTEGER - 100, 100])).toBe(Number.MAX_SAFE_INTEGER);
  expect(sumObservedCosts([Number.MAX_SAFE_INTEGER - 100, 100, 1])).toBeNull();
});
it("does not apply a whole-source-currency helper to decimal/manual or invalid inputs", () => {
  for (const price of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    expect(sumObservedCosts([price])).toBeNull();
  for (const sets of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    expect(sumObservedCosts([100], sets)).toBeNull();
});
