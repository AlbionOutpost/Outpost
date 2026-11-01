"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { useAtlasRegion } from "@/components/region-context";
import { sourceAge } from "@/lib/albion/source-age";
import { compact, Silver } from "./silver";
import { useLoad } from "./use-load";

type Price = {
  city: string;
  sell_price_min: number;
  sell_price_min_date: string;
  buy_price_max: number;
};

/**
 * One item quoted in every city with a listing, cheapest first, plus its daily average in the
 * cheapest city over 7 or 30 days. Every figure is an observation with its own time; a city
 * without a listing is simply absent.
 */
export function MarketCard({ item }: { item: { id: string; name: string; kind: string } }) {
  const region = useAtlasRegion();
  const [range, setRange] = useState<7 | 30>(30);
  const quotes = useLoad(`${region}:${item.id}`, async (signal) => {
    const r = await fetch(
      `/api/market?${new URLSearchParams({ region, item: item.id, quality: "1" })}`,
      { signal },
    );
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Market observations unavailable.");
    return {
      rows: ((body.prices ?? []) as Price[])
        .filter((p) => p.city !== "Black Market" && p.sell_price_min > 0)
        .toSorted((a, b) => a.sell_price_min - b.sell_price_min),
      at: Date.now(),
    };
  });
  const rows = quotes?.value?.rows ?? [];
  const city = rows[0]?.city ?? "Bridgewatch";
  const history = useLoad(`${region}:${item.id}:${city}`, async (signal) => {
    const r = await fetch(
      `/api/history?${new URLSearchParams({ kind: "history", region, item: item.id, city, quality: "1" })}`,
      { signal },
    );
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "History unavailable.");
    return ((body.data?.[0]?.data ?? []) as { avg_price: number; timestamp: string }[]).map(
      (d) => ({ v: d.avg_price, t: d.timestamp }),
    );
  });
  const points = (history?.value ?? []).slice(-range);
  const W = 320;
  const H = 96;
  const low = Math.min(...points.map((p) => p.v));
  const high = Math.max(...points.map((p) => p.v));
  const xy = points.map((p, i) => [
    (i / Math.max(1, points.length - 1)) * W,
    H - 8 - ((p.v - low) / (high - low || 1)) * (H - 20),
  ]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = points.at(-1);
  const day = (t: string) =>
    new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <div className="tool-card">
      <Link className="tool-search" href={`/tools/market?item=${item.id}&region=${region}`}>
        <Search size={16} aria-hidden="true" />
        <span>Search items, builds, guides…</span>
      </Link>
      <div className="tool-item">
        <ItemIcon id={item.id} size={52} />
        <span>
          <strong>{item.name}</strong>
          <small>{item.kind}</small>
        </span>
        <b className="tool-tier">{item.id.slice(0, 2)}</b>
      </div>
      <table className="tool-table">
        <thead>
          <tr>
            <th scope="col">City</th>
            <th scope="col">Buy order</th>
            <th scope="col">Sell order</th>
            <th scope="col">Spread</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 6).map((p) => {
            const spread = p.buy_price_max
              ? (p.sell_price_min - p.buy_price_max) / p.buy_price_max
              : null;
            const age = sourceAge(p.sell_price_min_date, quotes!.value!.at);
            return (
              <tr key={p.city} title={`Seen ${age.label}`}>
                <th scope="row">
                  <span className="city-dot" data-city={p.city} />
                  {p.city}
                </th>
                <td>{p.buy_price_max ? <Silver value={p.buy_price_max} /> : "—"}</td>
                <td className={age.stale ? "is-stale" : undefined}>
                  <Silver value={p.sell_price_min} />
                </td>
                <td className={spread == null ? "" : spread >= 0 ? "is-gain" : "is-loss"}>
                  {spread == null
                    ? "—"
                    : `${spread >= 0 ? "+" : "−"}${Math.abs(spread * 100).toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="tool-muted">
                {quotes?.error ??
                  (quotes ? "No listings for this item right now." : "Loading quotes…")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="tool-chart">
        <div className="tool-chart-head">
          <span>Average price ({city})</span>
          <span className="tool-segment" role="tablist" aria-label="Range">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
              >
                {r}D
              </button>
            ))}
          </span>
        </div>
        {points.length > 1 ? (
          <>
            <div className="tool-plot">
              <span className="tool-plot-y" aria-hidden="true">
                <i>{compact(high)}</i>
                <i>{compact((high + low) / 2)}</i>
                <i>{compact(low)}</i>
              </span>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`fill-${item.id}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity=".35" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.08, 0.5, 0.92].map((f) => (
                  <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="tool-grid" />
                ))}
                <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#fill-${item.id})`} />
                <path
                  d={line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {last && (
                <span className="tool-plot-tip">
                  <b>
                    <Silver value={last.v} />
                  </b>
                  <small>{day(last.t)}</small>
                </span>
              )}
            </div>
            <div className="tool-plot-x" aria-hidden="true">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <i key={f}>{day(points[Math.round(f * (points.length - 1))].t)}</i>
              ))}
            </div>
          </>
        ) : (
          <p className="tool-muted tool-plot-empty">
            {history?.error ?? (history ? "No history for this city yet" : "Loading history…")}
          </p>
        )}
      </div>
    </div>
  );
}
