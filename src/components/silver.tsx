import { AnimatedNumber } from "./animated-number";
import { variantSrcSet } from "@/lib/image-variants";
/** A silver amount with the game's coin, as every price in Albion is shown. */
export function Silver({
  value,
  plain = "—",
  digits = 0,
  animate = true,
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
      <img
        src="/albion/icons/silver.webp"
        srcSet={variantSrcSet("/albion/icons/silver.webp")}
        sizes="24px"
        alt=""
        width={16}
        height={16}
      />
      {animate ? (
        <AnimatedNumber value={value} digits={digits} minimumDigits={0} />
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
