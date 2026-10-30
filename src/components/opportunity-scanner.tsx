"use client";
import "./economy-workspaces.css";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import Link from "@/components/link";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import type { transport } from "@/lib/albion/transport";
import type { transportObservations } from "@/lib/albion/transport-prices";
type Row = ReturnType<typeof transport> &
  ReturnType<typeof transportObservations> & { itemId: string };
const itemPattern = /^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/;
const defaultItems = ["T4_BAG", "T4_MAIN_AXE", "T4_CAPE", "T4_HEAD_PLATE_SET1"];
const stamp = (value: string | null) => {
  if (!value) return "no observation";
  const time = sourceTimestamp(value);
  if (!Number.isFinite(time)) return "unknown time";
  const iso = new Date(time).toISOString();
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)} UTC${isStale(value) ? " · stale" : ""}`;
};
/**
 * Cross-city flip scanner. Pick up to 25 items, choose a route; observations load for the
 * current selection and every row keeps its own source times. Manual-ID entry stays available.
 */
export function OpportunityScanner() {
  const region = useAtlasRegion(),
    [items, setItems] = useState<string[]>(defaultItems),
    [names, setNames] = useState<Record<string, string>>({}),
    [manual, setManual] = useState(""),
    [from, setFrom] = useState("Lymhurst"),
    [to, setTo] = useState("Caerleon"),
    [quality, setQuality] = useState("1"),
    [mode, setMode] = useState("instant"),
    [tax, setTax] = useState("4"),
    [fee, setFee] = useState("2.5"),
    [result, setResult] = useState<{ key: string; rows: Row[]; methodology: string } | null>(null),
    [error, setError] = useState<{ key: string; message: string } | null>(null),
    [pendingKey, setPendingKey] = useState<string | null>(null);
  const query = new URLSearchParams({
    region,
    items: items.join(","),
    fromCity: from,
    toCity: to,
    quality,
    saleMode: mode,
    tax,
    fee,
  }).toString();
  const busy = pendingKey === query;
  const rows = result?.key === query ? result.rows : [];
  const hasResult = result?.key === query;
  const controller = useRef<AbortController | null>(null);
  async function scan() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = query;
    setPendingKey(key);
    setError(null);
    try {
      const r = await fetch(`/api/opportunities?${key}`, { signal: active.signal }),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      if (!active.signal.aborted) setResult({ key, rows: b.rows, methodology: b.methodology });
    } catch (e) {
      if (!active.signal.aborted)
        setError({ key, message: e instanceof Error ? e.message : "Scan unavailable" });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  const scanRef = useRef(scan);
  useEffect(() => {
    scanRef.current = scan;
  });
  useEffect(() => {
    if (!items.length || from === to) return;
    const timer = window.setTimeout(() => void scanRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [query, items.length, from, to]);
  useEffect(() => () => controller.current?.abort(), []);
  function add(id: string, name?: string) {
    const clean = id.trim().toUpperCase();
    if (!itemPattern.test(clean)) return;
    setItems((current) =>
      current.includes(clean) || current.length >= 25 ? current : [...current, clean],
    );
    if (name) setNames((current) => ({ ...current, [clean]: name }));
  }
  const label = (id: string) => names[id] || equipmentName(id);
  const money = (n: number | null) =>
    n === null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const profitable = rows.filter((row) => row.complete && (row.profit ?? 0) > 0).length;
  return (
    <section className="panel section flip-scanner" aria-labelledby="flip-scanner-heading">
      <div className="section-heading">
        <div>
          <h2 id="flip-scanner-heading">Cross-city flip scanner</h2>
          <p className="muted">
            Buy at the purchase market&apos;s lowest sell order, sell at the destination. Up to 25
            items per scan; estimates are leads to investigate, not guaranteed profit.
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={busy || !items.length || from === to}
          onClick={() => void scan()}
        >
          {busy ? "Scanning markets…" : "Rescan"}
        </button>
      </div>
      <div className="flip-scanner-items">
        <CatalogItemPicker
          label="Add an item to scan"
          onSelect={(item) => add(item.id, item.name)}
        />
        <ul className="flip-scanner-chips" aria-label="Items in this scan">
          {items.map((id) => (
            <li key={id}>
              <ItemIcon id={id} quality={Number(quality)} size={24} />
              <span>{label(id)}</span>
              <button
                type="button"
                aria-label={`Remove ${label(id)} from the scan`}
                onClick={() => setItems((current) => current.filter((item) => item !== id))}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          {!items.length && <li className="muted">No items yet. Search above or paste IDs.</li>}
        </ul>
        <details className="flip-scanner-manual">
          <summary>Paste item IDs</summary>
          <form
            className="market-form"
            onSubmit={(e) => {
              e.preventDefault();
              for (const id of manual.split(/[\s,]+/)) add(id);
              setManual("");
            }}
          >
            <label>
              Scanner item IDs (comma-separated)
              <textarea
                value={manual}
                maxLength={2600}
                placeholder="T5_BAG, T6_MAIN_AXE@1"
                onChange={(e) => setManual(e.target.value)}
              />
            </label>
            <button type="submit" className="button secondary" disabled={!manual.trim()}>
              Add IDs
            </button>
          </form>
        </details>
      </div>
      <div className="input-grid flip-scanner-route">
        <label>
          Purchase market
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {cities
              .filter((city) => city !== "Black Market")
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label>
          Destination market
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Sale execution
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="instant">Sell to buy orders</option>
            <option value="listing">Sell listing estimate</option>
          </select>
        </label>
        <label>
          Quality
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sales tax (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </label>
        <label>
          Listing fee (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={fee}
            disabled={mode !== "listing"}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
      </div>
      {from === to && (
        <p className="task-state" role="status">
          Choose two different markets to scan a route.
        </p>
      )}
      {error?.key === query && (
        <p className="error" role="alert">
          {error.message}
        </p>
      )}
      {busy && !hasResult && (
        <p className="task-state" role="status">
          Scanning {items.length} items from {from} to {to}…
        </p>
      )}
      {hasResult && (
        <>
          <p className="flip-scanner-summary" role="status">
            <strong>{profitable}</strong> of {rows.length} items show a positive estimate from{" "}
            {from} to {to} at {tax}% tax
            {mode === "listing" ? ` and ${fee}% listing fee` : ""}. Sorted by net estimate.
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Observed opportunity results"
          >
            <table className="flip-scanner-table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="numeric">
                    Buy · {from}
                  </th>
                  <th scope="col" className="numeric">
                    Sell · {to}
                  </th>
                  <th scope="col" className="numeric">
                    Net estimate
                  </th>
                  <th scope="col" className="numeric">
                    Margin
                  </th>
                  <th scope="col">Data status</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.itemId}
                    data-outcome={
                      !r.complete ? "incomplete" : (r.profit ?? 0) > 0 ? "positive" : "negative"
                    }
                  >
                    <th scope="row">
                      <span className="flip-scanner-item">
                        <ItemIcon id={r.itemId} quality={Number(quality)} size={32} />
                        <span>
                          {label(r.itemId)}
                          <small>{r.itemId}</small>
                        </span>
                      </span>
                    </th>
                    <td className="numeric">
                      {money(r.buy.value)}
                      <small>{stamp(r.buy.observedAt)}</small>
                    </td>
                    <td className="numeric">
                      {money(r.sell.value)}
                      <small>{stamp(r.sell.observedAt)}</small>
                    </td>
                    <td className="numeric flip-scanner-profit">
                      {r.profit === null
                        ? "—"
                        : `${r.profit > 0 ? "+" : ""}${r.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </td>
                    <td className="numeric">
                      {r.margin === null ? "—" : `${r.margin.toFixed(1)}%`}
                    </td>
                    <td>
                      {!r.complete
                        ? "Missing orders"
                        : r.stale
                          ? "Stale observations"
                          : "Recent observations"}
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/tools/transporting?${new URLSearchParams({ region, item: r.itemId, from, to, quality })}`}
                      >
                        Plan haul <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted flip-scanner-method">{result?.methodology}</p>
        </>
      )}
    </section>
  );
}
