"use client";
import { useEffect, useMemo, useId, useRef, useState } from "react";

import { items } from "@/lib/albion/item-database";
import { ItemIcon } from "./item-icon";
import {
  catalogBaseKey,
  catalogSearchResponse,
  groupCatalogOptions,
  mergeCatalogOptions,
  type CatalogOption,
} from "@/lib/catalog/search";
import { SearchInput } from "./field";
export type { CatalogOption } from "@/lib/catalog/search";
/** "T4–T8 · .0–.4" for a grouped row; "T6.1" for one version. */
function versions(item: CatalogOption) {
  const [low, high] = item.tiers ?? [item.tier, item.tier];
  const [flat, top] = item.enchantments ?? [item.enchantment, item.enchantment];
  if (low === high && flat === top) return `T${low}.${flat}`;
  return `T${low}${high > low ? `–T${high}` : ""}${top > 0 ? ` · .${flat}–.${top}` : ""}`;
}
/**
 * Search the catalog by name or identifier. `grouped` lists each base item once (Market
 * Explorer picks the tier and enchantment after); otherwise every version is its own row.
 */
export function CatalogItemPicker({
  onSelect,
  category = "",
  tier = "",
  enchantment = "",
  label = "Search market items",
  grouped = false,
}: {
  onSelect: (item: CatalogOption) => void;
  category?: string;
  tier?: string;
  enchantment?: string;
  label?: string;
  grouped?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [record, setRecord] = useState<{ key: string; rows: CatalogOption[]; error: string } | null>(
      null,
    );
  const id = useId(),
    box = useRef<HTMLDivElement>(null);
  const key = `${query}:${category}:${tier}:${enchantment}`;
  const fallback = useMemo(() => {
    const local = items
      .filter(
        (i) =>
          `${i.name} ${i.id}`.toLowerCase().includes(query.toLowerCase()) &&
          (!category ||
            (category === "Bag" && i.id.includes("_BAG")) ||
            (category === "Cape" && i.id.includes("_CAPE")) ||
            (category === "Main hand" && i.category === "Weapons")) &&
          (!tier || i.tier === Number(tier)) &&
          (!enchantment || i.enchantment === Number(enchantment)),
      )
      .map((i) => ({ ...i, slot: i.category }));
    return (grouped ? groupCatalogOptions(local, query) : local).slice(0, 12);
  }, [query, category, tier, enchantment, grouped]);
  const rows = record?.key === key ? record.rows : fallback;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const p = new URLSearchParams({ search: query });
      if (grouped) p.set("group", "base");
      if (category) p.set("slot", category);
      if (tier) p.set("tier", tier);
      if (enchantment) p.set("enchantment", enchantment);
      fetch(`/api/items?${p}`, { signal: controller.signal })
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error("Catalog unavailable; showing the local starter index.");
          return catalogSearchResponse.parse(body).items;
        })
        .then((rows) => {
          if (controller.signal.aborted) return;
          setRecord({
            key,
            rows: mergeCatalogOptions(rows, fallback, (row) =>
              grouped ? catalogBaseKey(row.id) : row.id,
            ),
            error: "",
          });
          setActive(0);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setRecord({
              key,
              rows: fallback,
              error: "Catalog unavailable; showing the local starter index.",
            });
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, open, query, category, tier, enchantment, fallback, grouped]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function select(item: CatalogOption) {
    onSelect(item);
    setQuery(item.name);
    setOpen(false);
    setActive(0);
  }
  return (
    <div className="catalog-picker" ref={box}>
      <label htmlFor={`${id}-input`}>{label}</label>
      <SearchInput
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] ? `${id}-option-${active}` : undefined}
        value={query}
        maxLength={100}
        placeholder="Search Battleaxe, Bag, Mercenary…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive((n) =>
              rows.length ? (n + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length : 0,
            );
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (rows[active]) select(rows[active]);
          }
        }}
      />
      {open && (
        <div className="catalog-results">
          <div role="listbox" id={`${id}-list`} aria-label="Matching market items">
            {rows.map((item, i) => (
              <button
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={active === i}
                id={`${id}-option-${i}`}
                key={item.id}
                onPointerMove={() => setActive(i)}
                onClick={() => select(item)}
              >
                <ItemIcon id={item.id} size={46} />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.slot} · {versions(item)}
                  </small>
                </span>
              </button>
            ))}
          </div>
          {!rows.length && <p>No matching items. Adjust the name or filters.</p>}
          {record?.key === key && record.error && <p role="status">{record.error}</p>}
        </div>
      )}
    </div>
  );
}
