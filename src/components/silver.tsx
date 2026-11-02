import { AnimatedNumber } from "./animated-number";
/** A silver amount with the game's coin, as every price in Albion is shown. */
export function Silver({
  value,
  plain = "—",
  digits = 0,
  animate = false,
}: {
  value: number | null | undefined;
  plain?: string;
  /** Fraction digits to keep (calculators show up to two). */
  digits?: number;
  animate?: boolean;
}) {
  if (value == null || !Number.isFinite(value)) return <>{plain}</>;
  return (
    <span className="silver">
      {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
      <img src="/albion/icons/silver.webp" alt="" width={16} height={16} />
      {animate ? (
        <AnimatedNumber value={value} digits={digits} />
      ) : (
        value.toLocaleString("en-US", { maximumFractionDigits: digits })
      )}
    </span>
  );
}
export const compact = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)}m`
    : v >= 10_000
      ? `${Math.round(v / 1000)}k`
      : Math.round(v).toLocaleString("en-US");
