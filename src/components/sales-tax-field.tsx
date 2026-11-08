"use client";
import { salesTaxPresets } from "@/lib/albion/sales-tax";
import { useId } from "react";
import { NumberField } from "./number-field";
import s from "./calculator-shell.module.css";

/**
 * Every sales-tax input: the editable field plus the Premium 4% / No premium 8% quick choices.
 * The field spans two columns so the choices sit beside the input (below it when narrow); they
 * stay outside the label so the field's name is the label alone.
 */
export function SalesTaxField({
  label = "Sales tax (%)",
  value,
  onValueChange,
  placeholder,
  className,
}: {
  label?: string;
  value: number | string;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const current = value === "" ? NaN : Number(value),
    id = useId();
  return (
    <div className={`${s.taxField}${className ? ` ${className}` : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={s.taxControls}>
        <NumberField
          id={id}
          min={0}
          max={100}
          decimals={2}
          placeholder={placeholder}
          value={Number.isNaN(current) ? "" : current}
          onValueChange={onValueChange}
        />
        <div className="segmented" role="group" aria-label="Premium or no premium">
          {salesTaxPresets.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={current === p.value}
              onClick={() => onValueChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
