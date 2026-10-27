"use client";
import { useEffect, useMemo, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { items } from "@/lib/albion/item-database";
import { ItemIcon } from "./item-icon";
import {
  catalogSearchResponse,
  mergeCatalogOptions,
  type CatalogOption,
} from "@/lib/catalog/search";
export type { CatalogOption } from "@/lib/catalog/search";
export function CatalogItemPicker({
  onSelect,
  category = "",
  tier = "",
  enchantment = "",
  label = "Search market items",
}: {
  onSelect: (item: CatalogOption) => void;
  category?: string;
  tier?: string;
  enchantment?: string;
  label?: string;
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
  const fallback = useMemo(
    () =>
      items
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
        .slice(0, 12)
        .map((i) => ({ ...i, slot: i.category })),
    [query, category, tier, enchantment],
  );
  const rows = record?.key === key ? record.rows : fallback;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const p = new URLSearchParams({ search: query });
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
          setRecord({ key, rows: mergeCatalogOptions(rows, fallback), error: "" });
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
  }, [key, open, query, category, tier, enchantment, fallback]);
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
      <div className="catalog-search-field">
        <Search size={19} aria-hidden="true" />
        <input
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
                rows.length
                  ? (n + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length
                  : 0,
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (rows[active]) select(rows[active]);
            }
          }}
        />
      </div>
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
                    {item.slot} · T{item.tier}.{item.enchantment}
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
