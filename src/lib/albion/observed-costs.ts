/** Whole-silver source prices only; preserve unknown/unsafe totals rather than rounding them. */
export function sumObservedCosts(prices: Iterable<number>, sets = 1): number | null {
  if (!Number.isSafeInteger(sets) || sets < 1) return null;
  let total = 0;
  for (const price of prices) {
    if (
      !Number.isSafeInteger(price) ||
      price < 0 ||
      price > Math.floor(Number.MAX_SAFE_INTEGER / sets)
    )
      return null;
    const cost = price * sets;
    if (total > Number.MAX_SAFE_INTEGER - cost) return null;
    total += cost;
  }
  return total;
}
