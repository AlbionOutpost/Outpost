"use client";
import { History } from "./history";
import Link from "next/link";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import { MarketWatchlist } from "./market-watchlist";
import { equipmentName, equipmentSlots } from "@/lib/albion/equipment-catalog";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { MarketPrice } from "@/lib/albion/market-client";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
export function Market() {
  const params = useSearchParams();
  const region = useAtlasRegion();
  const [item, setItem] = useState(params.get("item") || "T4_BAG");
  const [selectedName, setSelectedName] = useState("");
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState("");
  const [enchantment, setEnchantment] = useState("");
  const [quality, setQuality] = useState(params.get("quality") || "1");
  const [result, setResult] = useState<{ key: string; region: string; rows: MarketPrice[] } | null>(
    null,
  );
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("city");
  const controller = useRef<AbortController | null>(null);
  const current = `${region}:${item.trim().toUpperCase()}:${quality}`;
  useEffect(() => () => controller.current?.abort(), [current]);
  const loading = pendingKey === current;
  const rows = result?.key === current ? result.rows : [];
  const summary = summarizeQuotes(rows);
  const visible = rows
    .filter((r) => !city || r.city === city)
    .toSorted((a, b) =>
      sort === "sell"
        ? (a.sell_price_min || Infinity) - (b.sell_price_min || Infinity)
        : sort === "buy"
          ? b.buy_price_max - a.buy_price_max
          : a.city.localeCompare(b.city),
    );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = current;
    setPendingKey(current);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/market?${new URLSearchParams({ region, item: item.trim().toUpperCase(), quality })}`,
        { signal: active.signal },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.region !== region) throw new Error("Source region mismatch");
      if (!active.signal.aborted) setResult({ key, region, rows: data.prices });
    } catch (e) {
      if (!active.signal.aborted)
        setError({ key, message: e instanceof Error ? e.message : "Could not load prices" });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  const format = (n: number) => (n ? n.toLocaleString() : "Unavailable");
  const dateLabel = (value: string) => {
    const stamp = sourceTimestamp(value);
    return Number.isFinite(stamp)
      ? new Date(stamp).toISOString().slice(0, 16).replace("T", " ")
      : "Unknown";
  };
  return (
    <div className="market-workspace">
      <section className="market-board">
        <form className="market-form market-filters" onSubmit={submit}>
          <CatalogItemPicker
            category={category}
            tier={tier}
            enchantment={enchantment}
            onSelect={(i) => {
              setItem(i.id);
              setSelectedName(i.name);
            }}
          />
          <label>
            Quality
            <select
              aria-label="Quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((x, i) => (
                <option value={i + 1} key={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          <button className="button primary" disabled={loading}>
            {loading ? "Fetching observations…" : "Compare prices"}
          </button>
        </form>
        {error?.key === current && (
          <p role="alert" className="error">
            {error.message}
          </p>
        )}
        {result && result.key !== current && (
          <p role="status">
            {result.region !== region ? "Region changed." : "Selection changed."} Request new
            observations for the selected item and quality.
          </p>
        )}
        <>
          <div className="market-table-toolbar" aria-label="Observation filters">
            <label>
              Market city
              <select
                aria-label="Market city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Sort market prices
              <select
                aria-label="Sort market prices"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="city">City name</option>
                <option value="sell">Lowest sell price</option>
                <option value="buy">Highest buy price</option>
              </select>
            </label>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable market observations"
          >
            <table>
              <caption className="market-table-caption">
                <span>
                  <ItemIcon id={item} quality={Number(quality)} size={28} />
                  <strong>{selectedName || equipmentName(item)}</strong>
                </span>
                <span>
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][
                    Number(quality) - 1
                  ] || "Unknown quality"}{" "}
                  · {region} · Observed prices · UTC
                </span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Market</th>
                  <th scope="col" className="numeric" aria-label="Lowest sell order">
                    <span className="market-col-long">Lowest sell order</span>
                    <span className="market-col-short">Sell order</span>
                  </th>
                  <th scope="col" className="numeric" aria-label="Highest buy order">
                    <span className="market-col-long">Highest buy order</span>
                    <span className="market-col-short">Buy order</span>
                  </th>
                  <th scope="col">Sell observation (UTC)</th>
                  <th scope="col">Buy observation (UTC)</th>
                </tr>
              </thead>
              <tbody
                key={result?.key || "empty"}
                className={rows.length ? "price-refresh" : undefined}
              >
                {visible.map((r, i) => (
                  <tr key={`${r.city}-${i}`}>
                    <td>
                      <span className="market-table-item">
                        <ItemIcon id={r.item_id} quality={r.quality} size={36} />
                        <span>{equipmentName(r.item_id)}</span>
                      </span>
                    </td>
                    <td>
                      <span className="city-indicator" aria-hidden="true">
                        {r.city.slice(0, 2).toUpperCase()}
                      </span>
                      {r.city}
                    </td>
                    <td className="numeric">
                      <span className={!r.sell_price_min ? "market-price-missing" : undefined}>
                        {format(r.sell_price_min)}
                      </span>
                      <small className="market-inline-time" title={r.sell_price_min_date}>
                        {r.sell_price_min
                          ? `${dateLabel(r.sell_price_min_date).replace(/^\d{4}-/, "")}${isStale(r.sell_price_min_date) ? " · STALE" : ""}`
                          : "No observation"}
                      </small>
                    </td>
                    <td className="numeric">
                      <span className={!r.buy_price_max ? "market-price-missing" : undefined}>
                        {format(r.buy_price_max)}
                      </span>
                      <small className="market-inline-time" title={r.buy_price_max_date}>
                        {r.buy_price_max
                          ? `${dateLabel(r.buy_price_max_date).replace(/^\d{4}-/, "")}${isStale(r.buy_price_max_date) ? " · STALE" : ""}`
                          : "No observation"}
                      </small>
                    </td>
                    <td className="observation-time" title={r.sell_price_min_date}>
                      {r.sell_price_min
                        ? `${dateLabel(r.sell_price_min_date)} ${isStale(r.sell_price_min_date) ? "· STALE" : ""}`
                        : "—"}
                    </td>
                    <td className="observation-time" title={r.buy_price_max_date}>
                      {r.buy_price_max
                        ? `${dateLabel(r.buy_price_max_date)} ${isStale(r.buy_price_max_date) ? "· STALE" : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <div className="empty market-empty" role="status">
              {loading
                ? "Loading source observations…"
                : error?.key === current
                  ? "No observations loaded. Compare prices to retry."
                  : result?.key === current
                    ? "No observations available for this selection."
                    : "Choose an item and compare markets to begin."}
            </div>
          )}
        </>
        <small className="muted market-source-note">
          Source: Albion Online Data Project · Observations older than one hour or unexpectedly in
          the future are marked stale. Observations do not guarantee executable trades or liquidity.
        </small>
        <div className="market-secondary-controls">
          <details className="market-catalog-filters">
            <summary>Item filters</summary>
            <div className="market-discovery-filters">
              <label>
                Item category
                <select
                  aria-label="Item category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {equipmentSlots.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Item tier
                <select
                  aria-label="Market item tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
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
                  aria-label="Market enchantment"
                  value={enchantment}
                  onChange={(e) => setEnchantment(e.target.value)}
                >
                  <option value="">All enchantments</option>
                  {[0, 1, 2, 3, 4].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <details className="market-advanced">
            <summary>Advanced item identifier</summary>{" "}
            <label>
              Item identifier
              <input
                required
                pattern="[A-Za-z0-9_@]+"
                maxLength={100}
                value={item}
                onChange={(e) => {
                  setItem(e.target.value);
                  setSelectedName("");
                }}
                placeholder="e.g. T4_BAG or T6_MAIN_SWORD@1"
              />
            </label>
          </details>
        </div>
      </section>
      <aside className="market-item-panel">
        <div className="market-item-overview">
          <div className="market-selected-item">
            <ItemIcon id={item} quality={Number(quality)} size={88} />
            <div>
              <span className="eyebrow">SELECTED ITEM</span>
              <h2>{selectedName || equipmentName(item)}</h2>
              <p>
                {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][
                  Number(quality) - 1
                ] || "Unknown quality"}{" "}
                · {region}
              </p>
            </div>
          </div>
          <p className="quote-freshness">
            {rows.length
              ? !summary.available
                ? "No valid price observations were returned for this item."
                : summary.stale
                  ? "Some observations are stale. Check timestamps before trading."
                  : "Source timestamps are within the application freshness window."
              : "Request prices to inspect quote freshness."}
          </p>
          <dl className="market-quote-summary">
            <div>
              <dt>Lowest observed sell order</dt>
              <dd className={`numeric${summary.ask ? "" : " quote-unavailable"}`}>
                {summary.ask ? format(summary.ask.sell_price_min) : "Unavailable"}
                <small>{summary.ask?.city || "No available quote"}</small>
              </dd>
            </div>
            <div>
              <dt>Highest observed buy order</dt>
              <dd className={`numeric${summary.bid ? "" : " quote-unavailable"}`}>
                {summary.bid ? format(summary.bid.buy_price_max) : "Unavailable"}
                <small>{summary.bid?.city || "No available quote"}</small>
              </dd>
            </div>
          </dl>
          <div className="actions">
            <Link className="button secondary" href={`/tools/flipping?region=${region}`}>
              Plan a trade
            </Link>
            <Link className="text-link" href={`/items?region=${region}`}>
              Item reference
            </Link>
          </div>
        </div>
        <History item={item} quality={Number(quality)} />
        <MarketWatchlist region={region} itemId={item} quality={Number(quality)} />
      </aside>
    </div>
  );
}
