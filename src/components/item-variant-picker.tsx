"use client";
import { useState } from "react";
import Link from "@/components/build-region-link";
import { ItemIcon } from "./item-icon";
import { WellSelect } from "./well-select";

type Variant = { id: string; tier: number; enchantment: number; itemPower: number | null };

/** Phones: one tier at a time, its five enchantments in a row, instead of a sideways grid. */
export function ItemVariantPicker({ variants, current }: { variants: Variant[]; current: string }) {
  const tiers = [...new Set(variants.map((variant) => variant.tier))];
  const [tier, setTier] = useState(
    () => variants.find((variant) => variant.id === current)?.tier ?? tiers[0],
  );
  return (
    <div className="item-variant-picker">
      <label>
        <span>Tier</span>
        <WellSelect value={tier} onChange={(e) => setTier(Number(e.target.value))}>
          {tiers.map((value) => (
            <option key={value} value={value}>
              Tier {value}
            </option>
          ))}
        </WellSelect>
      </label>
      <ul aria-label={`Tier ${tier} enchantments`}>
        {[0, 1, 2, 3, 4].map((enchantment) => {
          const variant = variants.find(
            (candidate) => candidate.tier === tier && candidate.enchantment === enchantment,
          );
          return (
            <li key={enchantment}>
              {variant ? (
                <Link
                  className={`item-variant-cell${variant.id === current ? " is-current" : ""}`}
                  href={`/items/${variant.id}`}
                  aria-current={variant.id === current ? "page" : undefined}
                  aria-label={`T${tier}.${enchantment}, ${variant.itemPower ?? "unknown"} IP`}
                >
                  <ItemIcon id={variant.id} size={36} />
                  <span>.{enchantment}</span>
                </Link>
              ) : (
                <span className="item-variant-cell is-missing">
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">.{enchantment} is not in the catalog</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
