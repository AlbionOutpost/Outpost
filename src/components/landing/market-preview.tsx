"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ItemIcon } from "@/components/item-icon";
import { useAtlasRegion } from "@/components/region-context";
import { marketPrice, type MarketPrice } from "@/lib/albion/market-quotes";
import { regions } from "@/lib/albion/region-config";
import { sourceAge } from "@/lib/albion/source-age";
import { PreviewStatus } from "./preview-shell";

const quotes = z.object({ prices: z.array(marketPrice).max(10000) });
const history = z.object({
  data: z
    .array(
      z.object({
        data: z.array(z.object({ avg_price: z.number(), timestamp: z.string() })).max(1000),
      }),
    )
    .max(100),
});
type Point = { avg_price: number; timestamp: string };
type Load<T> =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T; fetchedAt: number };
type Keyed<T> = { key: string; value: Exclude<Load<T>, { status: "idle" | "loading" }> };

const silver = (n: number) => n.toLocaleString("en-US");

/**
 * Real quotes for one item in three cities plus its recorded 30-day trend in one of them,
 * loaded from the same endpoints as the Market Explorer once the card scrolls into view.
 * Every quote keeps its own source time; a city without an observation stays "Unavailable".
 */
export function MarketPreview({
  item,
  cities,
  trendCity,
}: {
  item: { id: string; name: string; tier: string };
  cities: readonly string[];
  trendCity: string;
}) {
  const region = useAtlasRegion();
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [priceResult, setPriceResult] = useState<Keyed<MarketPrice[]> | null>(null);
  const [trendResult, setTrendResult] = useState<Keyed<Point[]> | null>(null);
  const quality = 1;
  const key = `${region}:${item.id}:${quality}:${trendCity}`;
  // Loading is derived from the key so the effect never sets state synchronously.
  const prices: Load<MarketPrice[]> = !seen
    ? { status: "idle" }
    : priceResult?.key === key
      ? priceResult.value
      : { status: "loading" };
  const trend: Load<Point[]> = !seen
    ? { status: "idle" }
    : trendResult?.key === key
      ? trendResult.value
      : { status: "loading" };

  useEffect(() => {
    const target = root.current;
    if (!target || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setSeen(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    const controller = new AbortController();
    const params = { region, item: item.id, quality: String(quality) };
    const setPrices = (value: Keyed<MarketPrice[]>["value"]) => setPriceResult({ key, value });
    const setTrend = (value: Keyed<Point[]>["value"]) => setTrendResult({ key, value });
    fetch(`/api/market?${new URLSearchParams(params)}`, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Market data is unavailable.");
        const parsed = quotes.parse(body);
        setPrices({
          status: "ready",
          data: parsed.prices.filter((p) => p.item_id === item.id && p.quality === quality),
          fetchedAt: Date.now(),
        });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setPrices({ status: "error", message: e instanceof Error ? e.message : "Unavailable" });
      });
    fetch(`/api/history?${new URLSearchParams({ kind: "history", ...params, city: trendCity })}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "History is unavailable.");
        const rows = history.parse(body).data[0]?.data ?? [];
        setTrend({
          status: "ready",
          data: rows
            .filter((p) => p.avg_price > 0)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
          fetchedAt: Date.now(),
        });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setTrend({ status: "error", message: e instanceof Error ? e.message : "Unavailable" });
      });
    return () => controller.abort();
  }, [seen, key, region, item.id, trendCity]);

  const now = prices.status === "ready" ? prices.fetchedAt : 0;
  return (
    <div ref={root} className="market-preview">
      <div className="market-preview-item">
        <ItemIcon id={item.id} size={44} />
        <div>
          <strong>{item.name}</strong>
          <span>
            {item.tier} · Normal quality · {regions[region].label}
          </span>
        </div>
      </div>
      <table className="market-preview-table">
        <thead>
          <tr>
            <th scope="col">City</th>
            <th scope="col" className="is-number">
              Sell order
            </th>
            <th scope="col" className="is-number">
              Buy order
            </th>
            <th scope="col">Seen</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((city) => {
            const row =
              prices.status === "ready" ? prices.data.find((p) => p.city === city) : undefined;
            const sell = row?.sell_price_min ? row : null;
            const buy = row?.buy_price_max ? row : null;
            const age = sell ? sourceAge(sell.sell_price_min_date, now) : null;
            return (
              <tr key={city} className={prices.status === "loading" ? "is-loading" : undefined}>
                <th scope="row">{city}</th>
                <td className="is-number">
                  {sell ? silver(sell.sell_price_min) : <span className="is-missing">—</span>}
                </td>
                <td className="is-number">
                  {buy ? silver(buy.buy_price_max) : <span className="is-missing">—</span>}
                </td>
                <td>
                  {age ? (
                    <time
                      dateTime={sell!.sell_price_min_date}
                      className={age.stale ? "is-stale" : undefined}
                    >
                      {age.label}
                    </time>
                  ) : prices.status === "ready" || prices.status === "error" ? (
                    <span className="is-missing">Unavailable</span>
                  ) : (
                    <span className="is-missing">…</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {prices.status === "error" && (
        <PreviewStatus>{prices.message} No prices have been substituted.</PreviewStatus>
      )}
      <Trend city={trendCity} state={trend} />
      <p className="landing-preview-source">
        Source: Albion Online Data Project, {regions[region].label} server · the same quotes the
        Market Explorer shows.
      </p>
    </div>
  );
}

function Trend({ city, state }: { city: string; state: Load<Point[]> }) {
  const points = state.status === "ready" ? state.data : [];
  const width = 320,
    height = 72;
  let path = "",
    area = "",
    low = 0,
    high = 0;
  if (points.length > 1) {
    low = Math.min(...points.map((p) => p.avg_price));
    high = Math.max(...points.map((p) => p.avg_price));
    const span = high - low || 1;
    const coords = points.map((p, i) => [
      (i / (points.length - 1)) * width,
      height - 6 - ((p.avg_price - low) / span) * (height - 12),
    ]);
    path = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    area = `${path} L${width} ${height} L0 ${height} Z`;
  }
  const last = points.at(-1);
  const first = points[0];
  const day = (p: Point) => p.timestamp.slice(5, 10).replace("-", "/");
  return (
    <figure className="market-preview-trend">
      <figcaption>
        <span>
          30-day average · {city}
          {last ? ` · ${silver(Math.round(last.avg_price))}` : ""}
        </span>
        {points.length > 1 && (
          <span className="market-preview-range">
            {silver(Math.round(low))} – {silver(Math.round(high))}
          </span>
        )}
      </figcaption>
      {points.length > 1 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Average daily price in ${city} over the last ${points.length} recorded days, from ${silver(Math.round(low))} to ${silver(Math.round(high))} silver`}
        >
          <defs>
            <linearGradient id="market-preview-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#market-preview-fill)" />
          <path
            d={path}
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="market-preview-empty">
          {state.status === "loading" || state.status === "idle"
            ? "Loading recorded history…"
            : state.status === "error"
              ? "History unavailable. Nothing has been substituted."
              : `No daily history recorded for ${city} in the last 30 days.`}
        </p>
      )}
      {first && last && points.length > 1 && (
        <div className="market-preview-axis" aria-hidden="true">
          <span>{day(first)}</span>
          <span>{points.length} daily averages</span>
          <span>{day(last)}</span>
        </div>
      )}
    </figure>
  );
}
