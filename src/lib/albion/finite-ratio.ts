/** Keep valid monetary inputs intact; unavailable ratios must never display Infinity or NaN. */
export function finiteRatio(numerator: number | null, denominator: number | null, multiplier = 1) {
  if (
    numerator === null ||
    denominator === null ||
    denominator === 0 ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    !Number.isFinite(multiplier)
  )
    return null;
  const result = (numerator / denominator) * multiplier;
  return Number.isFinite(result) ? result : null;
}
