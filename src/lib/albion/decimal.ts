/** Exact ratio of a validated finite decimal input, including exponential notation. */
export function decimalRatio(value: number): [bigint, bigint] {
  const [coefficient, exponent = "0"] = value.toString().toLowerCase().split("e");
  const [whole, fraction = ""] = coefficient.split(".");
  const numerator = BigInt(whole + fraction),
    scale = fraction.length - Number(exponent);
  return scale >= 0 ? [numerator, 10n ** BigInt(scale)] : [numerator * 10n ** BigInt(-scale), 1n];
}
