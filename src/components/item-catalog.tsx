"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, LayoutGrid, List, RotateCw, Search } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import Link from "@/components/link";
import { items } from "@/lib/albion/item-database";
import { ItemIcon } from "./item-icon";
import { Disclosure } from "./disclosure";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import { catalogSearchResponse } from "@/lib/catalog/search";
import { z } from "zod";
import styles from "./item-catalog.module.css";
const responseSchema = catalogSearchResponse.extend({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
});
const tierLabel = (id: string) => {
  const match = /^T(\d)_[^@]*(?:@(\d))?$/.exec(id);
  return match ? `T${match[1]}.${match[2] ?? 0}` : "No tier";
};
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
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [enchantment, setEnchantment] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState({
    items: metadata,
    total: initialTotal,
    key: "search=&page=1",
  });
  const [errorKey, setErrorKey] = useState("");
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams({ search, page: String(page) });
  if (category) params.set("slot", category);
  if (tier) params.set("tier", tier);
  if (enchantment) params.set("enchantment", enchantment);
  const requestKey = params.toString();
  // A failed refresh of the page the server already rendered keeps showing those rows.
  const error = errorKey === `${requestKey}#${retry}` && requestKey !== result.key;
  const busy = requestKey !== result.key && !error;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/items?${requestKey}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Item catalog unavailable");
        const data = responseSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setResult({ ...data, key: requestKey });
        }
      } catch {
        if (!controller.signal.aborted) setErrorKey(`${requestKey}#${retry}`);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, retry]);
  const region = useOutpostRegion();
  const shortcuts = items.filter(
    (i) =>
      (i.name + " " + i.id).toLowerCase().includes(search.toLowerCase()) &&
      (!tier || i.tier === Number(tier)) &&
      (!enchantment || i.enchantment === Number(enchantment)) &&
      !category,
  );
  const filtered = !!(search || tier || enchantment || category);
  const clear = () => {
    setSearch("");
    setTier("");
    setEnchantment("");
    setCategory("");
    setPage(1);
  };
  const pages = Math.max(1, Math.ceil(result.total / 30));
  const shown = result.items;
  const itemHref = (id: string) => `/items/${id}?region=${region}`;
  return (
    <div className={`item-catalog ${styles.catalog}`} aria-busy={busy}>
      <section className={`raised ${styles.filters}`} aria-label="Find an item">
        <nav className={styles.categories} aria-label="Item categories">
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
        <div className={styles.fields}>
          <label className={styles.search}>
            <span>Search item name or identifier</span>
            <span className={styles.searchWell}>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Battleaxe, T6_MAIN_SWORD…"
              />
            </span>
          </label>
          <label className={styles.categorySelect}>
            <span>Category</span>
            <WellSelect
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
            </WellSelect>
          </label>
          <label>
            <span>Tier</span>
            <WellSelect
              aria-label="Tier"
              value={tier}
              onChange={(e) => {
                setTier(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All tiers</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            <span>Enchantment</span>
            <WellSelect
              aria-label="Enchantment"
              value={enchantment}
              onChange={(e) => {
                setEnchantment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any</option>
              {[0, 1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>
                  .{t}
                </option>
              ))}
            </WellSelect>
          </label>
        </div>
      </section>
      <div className={styles.bar}>
        <p role="status" className={styles.count}>
          {error ? "" : busy ? "Loading items…" : `${result.total.toLocaleString()} matching items`}
        </p>
        {filtered && shown.length > 0 && (
          <button type="button" className="pill-link is-small" onClick={clear}>
            Clear filters
          </button>
        )}
        <div className={styles.view} role="group" aria-label="Item display">
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <List size={15} aria-hidden="true" />
            List
          </button>
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
            <LayoutGrid size={15} aria-hidden="true" />
            Grid
          </button>
        </div>
      </div>
      {error ? (
        <EmptyWell
          title="The item list could not load"
          line="Your search and filters are kept."
          action={
            <button
              type="button"
              className="button secondary"
              onClick={() => setRetry((n) => n + 1)}
            >
              <RotateCw size={15} aria-hidden="true" />
              Try again
            </button>
          }
        />
      ) : !busy && !shown.length ? (
        <EmptyWell
          title="No items match these filters"
          line="Try a shorter name or an exact item ID like T6_MAIN_SWORD."
          action={
            <button type="button" className="button secondary" onClick={clear}>
              Clear filters
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul className={`item-catalog-grid ${styles.grid}`}>
          {shown.map((item) => (
            <li key={item.id}>
              <article className={styles.cell}>
                <span className={styles.well}>
                  <ItemIcon id={item.id} size={64} />
                </span>
                <h2>
                  <Link href={itemHref(item.id)}>{item.name}</Link>
                </h2>
                <p>
                  {tierLabel(item.id)} · {item.slot}
                </p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`table-scroll ${styles.tableWell}`}>
          <table className={styles.table}>
            <caption className="sr-only">Items in the catalog; open a row for its prices</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className={styles.categoryCol}>
                  Category
                </th>
                <th scope="col" className={styles.idCol}>
                  Identifier
                </th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div className={styles.identity}>
                      <span className={styles.rowWell}>
                        <ItemIcon id={i.id} size={40} />
                      </span>
                      <div>
                        <Link className={styles.rowLink} href={itemHref(i.id)}>
                          {i.name}
                        </Link>
                        <small>{tierLabel(i.id)}</small>
                      </div>
                    </div>
                  </td>
                  <td className={styles.categoryCol}>{i.slot}</td>
                  <td className={styles.idCol}>
                    <code>{i.id}</code>
                  </td>
                  <td className={styles.open}>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!error && pages > 1 && (
        <nav className={styles.pages} aria-label="Item pages">
          <button
            type="button"
            className="button secondary"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            Previous items
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={busy || page * 30 >= result.total}
            onClick={() => setPage(page + 1)}
          >
            Next items
          </button>
        </nav>
      )}
      <div className={styles.notes}>
        {!!shortcuts.length && (
          <Disclosure summary="Quick market picks" meta={`${shortcuts.length} items`}>
            <p className={styles.noteLine}>Open one straight in Market Explorer.</p>
            <ul className={styles.picks}>
              {shortcuts.map((i) => (
                <li key={i.id}>
                  <Link
                    className="pill-link is-small"
                    href={`/tools/market?region=${region}&item=${encodeURIComponent(i.id)}`}
                  >
                    {i.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
        <Disclosure summary="Item data and patch coverage">
          <p className={styles.noteLine}>
            The item index does not cover every game item, and the current patch is not verified
            yet. Confirm item values and unlocks in game.
          </p>
        </Disclosure>
      </div>
    </div>
  );
}
