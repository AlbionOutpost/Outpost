"use client";
import { useState } from "react";
import Link from "@/components/build-region-link";
import { ItemIcon } from "./item-icon";
import { WellSelect } from "./well-select";
import styles from "./item-variant-picker.module.css";

export type ItemVariant = {
  id: string;
  tier: number;
  enchantment: number;
  itemPower: number | null;
  name?: string;
};

/**
 * One tier at a time, its five enchantments in a row. On the item page each cell links to that
 * version; with `onSelect` (Market Explorer) the cells pick it in place, and a new tier picks
 * the same enchantment there (or the flat version).
 */
export function ItemVariantPicker({
  variants,
  current,
  onSelect,
  className = "",
}: {
  variants: ItemVariant[];
  current: string;
  onSelect?: (variant: ItemVariant) => void;
  className?: string;
}) {
  const tiers = [...new Set(variants.map((variant) => variant.tier))];
  const selected = variants.find((variant) => variant.id === current);
  const [chosen, setChosen] = useState(() => selected?.tier ?? tiers[0]);
  // A pick made elsewhere (search, a typed identifier) moves the tier with it.
  const tier = onSelect && selected ? selected.tier : chosen;
  const find = (t: number, enchantment: number) =>
    variants.find((candidate) => candidate.tier === t && candidate.enchantment === enchantment);
  return (
    <div className={`${styles.picker} ${className}`}>
      <label>
        <span>Tier</span>
        <WellSelect
          value={tier}
          onChange={(e) => {
            const next = Number(e.target.value);
            setChosen(next);
            const pick = find(next, selected?.enchantment ?? 0) ?? find(next, 0);
            if (onSelect && pick) onSelect(pick);
          }}
        >
          {tiers.map((value) => (
            <option key={value} value={value}>
              Tier {value}
            </option>
          ))}
        </WellSelect>
      </label>
      <ul aria-label={`Tier ${tier} enchantments`}>
        {[0, 1, 2, 3, 4].map((enchantment) => {
          const variant = find(tier, enchantment);
          const isCurrent = variant?.id === current;
          const className = `${styles.cell} item-variant-cell${isCurrent ? ` ${styles.current} is-current` : ""}`;
          const label = `T${tier}.${enchantment}, ${variant?.itemPower ?? "unknown"} IP`;
          const face = variant && (
            <>
              <ItemIcon id={variant.id} size={36} />
              <span>.{enchantment}</span>
            </>
          );
          return (
            <li key={enchantment}>
              {!variant ? (
                <span className={`${styles.cell} ${styles.missing} item-variant-cell is-missing`}>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">.{enchantment} is not in the catalog</span>
                </span>
              ) : onSelect ? (
                <button
                  type="button"
                  className={className}
                  aria-pressed={isCurrent}
                  aria-label={label}
                  onClick={() => onSelect(variant)}
                >
                  {face}
                </button>
              ) : (
                <Link
                  className={className}
                  href={`/items/${variant.id}`}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={label}
                >
                  {face}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
