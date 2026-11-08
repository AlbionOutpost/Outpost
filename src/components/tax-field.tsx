"use client";
import { NumberField } from "./number-field";
import m from "./market-scans.module.css";

/** Sales tax with the two in-game rates one tap away; any other rate can be typed. */
export function TaxField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className={m.tax}>
      <label>
        Sales tax (%)
        <NumberField
          min={0}
          max={100}
          step={0.5}
          decimals={1}
          value={value}
          onValueChange={onChange}
        />
      </label>
      <div className="segmented" role="group" aria-label="Sales tax rate">
        <button type="button" aria-pressed={value === 4} onClick={() => onChange(4)}>
          Premium 4%
        </button>
        <button type="button" aria-pressed={value === 8} onClick={() => onChange(8)}>
          No premium 8%
        </button>
      </div>
    </div>
  );
}
