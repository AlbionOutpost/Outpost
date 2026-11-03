"use client";
import NumberFlow, { continuous, usePrefersReducedMotion, type Format } from "@number-flow/react";

const plugins = [continuous];

/** Continuous, interruptible motion; the accessible value is always the real target. */
export function AnimatedNumber({
  value,
  digits = 0,
  suffix = "",
  signed = false,
  minimumDigits = digits,
}: {
  value: number;
  digits?: number;
  suffix?: string;
  signed?: boolean;
  minimumDigits?: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const format: Format = {
    maximumFractionDigits: digits,
    minimumFractionDigits: minimumDigits,
    signDisplay: signed ? "always" : "auto",
  };
  const text = `${value.toLocaleString("en-US", format)}${suffix}`;
  return (
    <span className="animated-number" role="group" aria-label={text} data-value={value}>
      <NumberFlow
        value={value}
        locales="en-US"
        format={format}
        suffix={suffix}
        plugins={plugins}
        animated={!reducedMotion}
        respectMotionPreference
        aria-hidden="true"
      />
    </span>
  );
}
