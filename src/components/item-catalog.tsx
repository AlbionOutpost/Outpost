"use client";
import { useEffect, useState } from "react";
import { useAtlasRegion } from "./region-context";
import Link from "@/components/link";
import { items } from "@/lib/albion/item-database";
import { ItemIcon } from "./item-icon";
import { catalogSearchResponse } from "@/lib/catalog/search";
import { z } from "zod";
const responseSchema = catalogSearchResponse.extend({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
});
export function ItemCatalog({
  metadata = [],
  total: initialTotal = 0,
  categories = [],
}: {
  metadata?: { id: string; name: string; tier: number; enchantment: number; slot: string }[];
  total?: number;
  categories?: string[];
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [enchantment, setEnchantment] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState({
    items: metadata,
    total: initialTotal,
    key: "search=&page=1",
  });
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams({ search, page: String(page) });
  if (category) params.set("slot", category);
  if (tier) params.set("tier", tier);
  if (enchantment) params.set("enchantment", enchantment);
  const requestKey = params.toString();
  const busy = requestKey !== result.key;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/items?${requestKey}`, { signal: controller.signal });
        if (!response.ok)
          throw new Error("Item catalog unavailable. Retry to load this selection.");
        const data = responseSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setResult({ ...data, key: requestKey });
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Item catalog unavailable");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, retry]);
  const region = useAtlasRegion();
  const shortcuts = items.filter(
    (i) =>
      (i.name + " " + i.id).toLowerCase().includes(search.toLowerCase()) &&
      (!tier || i.tier === Number(tier)) &&
      (!enchantment || i.enchantment === Number(enchantment)) &&
      !category,
  );
  return (
    <section className="panel item-reference-browser" aria-busy={busy && !error}>
      <nav className="item-category-nav" aria-label="Item categories">
        {["", ...categories].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={category === value}
            onClick={() => {
              setCategory(value);
              setPage(1);
            }}
          >
            {value || "All items"}
          </button>
        ))}
      </nav>
      <label className="item-category-select">
        Category
        <select
          aria-label="Item category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All items</option>
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <div className="market-form">
        <label>
          Search item name or identifier
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Try Battleaxe"
          />
        </label>
        <label>
          Tier
          <select
            aria-label="Tier"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All tiers</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Enchantment
          <select
            aria-label="Enchantment"
            value={enchantment}
            onChange={(e) => {
              setEnchantment(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
            {[0, 1, 2, 3, 4].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        {busy ? "Loading selection…" : `${result.total.toLocaleString()} imported records`} · Source
        coverage is incomplete; current-patch verification is pending.
      </p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Retry catalog
          </button>
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Identifier</th>
              <th>Market</th>
            </tr>
          </thead>
          <tbody>
            {(!busy ? result.items : []).map((i) => (
              <tr key={i.id}>
                <td>
                  <div className="catalog-item-identity">
                    <ItemIcon id={i.id} />
                    <div>
                      <Link className="text-link" href={`/items/${i.id}?region=${region}`}>
                        {i.name}
                      </Link>
                      <small>
                        {i.slot} · {i.id}
                      </small>
                    </div>
                  </div>
                </td>
                <td>{i.slot}</td>
                <td>{i.id}</td>
                <td>
                  <Link
                    className="text-link"
                    href={`/tools/market?region=${region}&item=${encodeURIComponent(i.id)}`}
                  >
                    Compare prices →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button
          className="button secondary"
          disabled={page === 1 || busy}
          onClick={() => setPage(page - 1)}
        >
          Previous items
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(result.total / 30))}
        </span>
        <button
          className="button secondary"
          disabled={busy || page * 30 >= result.total}
          onClick={() => setPage(page + 1)}
        >
          Next items
        </button>
      </div>
      {!busy && !result.items.length && (
        <p className="empty">
          No matches in the curated index. The market explorer also accepts exact IDs outside this
          subset.
        </p>
      )}
      {!!shortcuts.length && (
        <details>
          <summary>Original market shortcuts ({shortcuts.length})</summary>
          <p className="muted">Original starter names; separate from imported metadata.</p>
          {shortcuts.map((i) => (
            <p key={i.id}>
              <Link
                className="text-link"
                href={`/tools/market?region=${region}&item=${encodeURIComponent(i.id)}`}
              >
                {i.name}
              </Link>
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
