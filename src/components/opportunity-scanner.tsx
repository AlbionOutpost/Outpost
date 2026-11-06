"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
import { Disclosure } from "./disclosure";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import { Observed, coin } from "./calculator-figures";
import type { transport } from "@/lib/albion/transport";
import type { transportObservations } from "@/lib/albion/transport-prices";
import s from "@/app/production-calculator.module.css";
import c from "@/app/calculators.module.css";
type Row = ReturnType<typeof transport> &
  ReturnType<typeof transportObservations> & { itemId: string };
const itemPattern = /^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/;
const defaultItems = ["T4_BAG", "T4_MAIN_AXE", "T4_CAPE", "T4_HEAD_PLATE_SET1"];
const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
/** A price with its own observation time, or "— Unavailable". */
function Quote({ value, at }: { value: number | null; at: string | null }) {
  if (value === null) return <Unavailable />;
  return (
    <>
      {coin(value)}
      <small>
        {at && Number.isFinite(sourceTimestamp(at)) ? <Observed at={at} /> : "Unknown time"}
      </small>
    </>
  );
}
/**
 * Cross-city flip scanner. Pick up to 25 items, choose a route; observations load for the
 * current selection and every row keeps its own source times. Manual-ID entry stays available.
 */
export function OpportunityScanner() {
  const region = useOutpostRegion(),
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
        setError({
          key,
          message: e instanceof Error && e.message ? e.message : "The scan couldn’t load.",
        });
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
  const profitable = rows.filter((row) => row.complete && (row.profit ?? 0) > 0).length;
  const canScan = items.length > 0 && from !== to;
  return (
    <section className={`panel ${c.scanner}`} aria-labelledby="flip-scanner-heading">
      <PanelHead
        id="flip-scanner-heading"
        title="Scan a route"
        line="Buy at the lowest sell order in one city and see what each item sells for in the other."
        actions={
          canScan ? (
            <button
              type="button"
              className={`button secondary ${s.refresh}`}
              aria-busy={busy}
              disabled={busy}
              onClick={() => void scan()}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {busy ? "Scanning…" : "Rescan"}
            </button>
          ) : undefined
        }
      />
      <div className={c.scanSetup}>
        <div className={`${s.fields} ${c.routeFields}`}>
          <label>
            Buy in
            <WellSelect
              aria-label="Purchase market"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {cities
                .filter((city) => city !== "Black Market")
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </WellSelect>
          </label>
          <label>
            Sell in
            <WellSelect
              aria-label="Destination market"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </WellSelect>
          </label>
          <label>
            Sell by
            <WellSelect value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="instant">Buy orders</option>
              <option value="listing">My sell orders</option>
            </WellSelect>
          </label>
          <label>
            Quality
            <WellSelect value={quality} onChange={(e) => setQuality(e.target.value)}>
              {qualities.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Tax (%)
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </label>
          {mode === "listing" && (
            <label>
              Setup fee (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className={c.scanItems}>
          <CatalogItemPicker
            label="Add an item to scan"
            onSelect={(item) => add(item.id, item.name)}
          />
          {items.length > 0 && (
            <ul className={c.chips} aria-label="Items in this scan">
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
            </ul>
          )}
          <div className={s.stack}>
            <Disclosure summary="Paste item IDs" meta={`${items.length} of 25`}>
              <form
                className={c.pasteForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  for (const id of manual.split(/[\s,]+/)) add(id);
                  setManual("");
                }}
              >
                <label>
                  Item IDs, separated by commas
                  <textarea
                    value={manual}
                    maxLength={2600}
                    placeholder="T5_BAG, T6_MAIN_AXE@1"
                    onChange={(e) => setManual(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className={`button secondary ${c.start}`}
                  disabled={!manual.trim()}
                >
                  Add IDs
                </button>
              </form>
            </Disclosure>
          </div>
        </div>
      </div>
      {!items.length ? (
        <div className={c.emptyMap}>
          <p className={c.emptyTitle}>Nothing to scan yet</p>
          <p className={c.emptyLine}>Search for an item above, or paste a list of item IDs.</p>
        </div>
      ) : from === to ? (
        <StatusLine>Pick two different cities to scan a route.</StatusLine>
      ) : error?.key === query ? (
        <div className={s.errorLine}>
          <StatusLine tone="error">{error.message}</StatusLine>
          <button type="button" onClick={() => void scan()}>
            Retry
          </button>
        </div>
      ) : busy && !hasResult ? (
        <StatusLine>
          Scanning {items.length} {items.length === 1 ? "item" : "items"} from {from} to {to}…
        </StatusLine>
      ) : hasResult ? (
        <StatusLine>
          {profitable} of {rows.length} {rows.length === 1 ? "item makes" : "items make"} silver
          from {from} to {to}, best first.
        </StatusLine>
      ) : null}
      {items.length > 0 && from !== to && (
        <div className={c.flips} role="region" aria-label="Scan results">
          <div className={c.flipHead} aria-hidden="true">
            <span>Item</span>
            <span>Buy · {from}</span>
            <span>Sell · {to}</span>
            <span>Net</span>
            <span>Margin</span>
            <span />
          </div>
          <ul>
            {(hasResult
              ? rows
              : items.map((itemId) => ({ itemId }) as Pick<Row, "itemId"> & Partial<Row>)
            ).map((r) => (
              <li
                key={r.itemId}
                className={c.flip}
                data-outcome={
                  !hasResult
                    ? undefined
                    : !r.complete
                      ? "incomplete"
                      : (r.profit ?? 0) > 0
                        ? "positive"
                        : "negative"
                }
              >
                <ItemIcon id={r.itemId} quality={Number(quality)} size={40} />
                <span className={c.flipName}>
                  <strong>{label(r.itemId)}</strong>
                  <small>
                    {!hasResult
                      ? busy
                        ? "Loading…"
                        : "Not scanned"
                      : !r.complete
                        ? "Missing an order"
                        : r.stale
                          ? "Includes old prices"
                          : "Recent prices"}
                  </small>
                </span>
                <span className={c.flipPrice}>
                  <span className={c.flipLabel}>Buy · {from}</span>
                  {r.buy ? (
                    <Quote value={r.buy.value} at={r.buy.observedAt} />
                  ) : (
                    <span className={s.dash}>—</span>
                  )}
                </span>
                <span className={c.flipPrice}>
                  <span className={c.flipLabel}>Sell · {to}</span>
                  {r.sell ? (
                    <Quote value={r.sell.value} at={r.sell.observedAt} />
                  ) : (
                    <span className={s.dash}>—</span>
                  )}
                </span>
                <span className={c.flipNet}>
                  <span className="sr-only">Net: </span>
                  {r.profit != null ? (
                    coin(r.profit)
                  ) : hasResult ? (
                    <span className={c.flipNa}>
                      <Unavailable />
                    </span>
                  ) : (
                    <span className={s.dash}>—</span>
                  )}
                </span>
                <span className={c.flipMargin}>
                  <span className="sr-only">Margin: </span>
                  {r.margin == null ? "" : `${r.margin.toFixed(1)}%`}
                </span>
                <Link
                  className={`pill-link ${c.flipAction}`}
                  aria-label={`Plan haul for ${label(r.itemId)}`}
                  href={`/tools/transporting?${new URLSearchParams({ region, item: r.itemId, from, to, quality })}`}
                >
                  Plan haul <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasResult && (
        <div className={s.stack}>
          <Disclosure summary="How the scan works">
            <div className={c.prose}>
              <p>
                Net is the sale after {tax}% tax
                {mode === "listing" ? ` and a ${fee}% setup fee` : ""}, minus the purchase, for one
                item at {qualities[Number(quality) - 1].toLowerCase()} quality. These are leads to
                check in game, not promises: orders fill and move.
              </p>
              <p>
                The buy price is the lowest sell order. The sale is the best buy order, or the
                lowest sell order when you post one. How much sells, how fast, and the danger of the
                route aren’t counted.
              </p>
            </div>
          </Disclosure>
        </div>
      )}
    </section>
  );
}
