"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { useAtlasRegion } from "@/components/region-context";
import { marketPrice, type MarketPrice } from "@/lib/albion/market-quotes";
import { regions } from "@/lib/albion/region-config";
import { sourceAge } from "@/lib/albion/source-age";
import { Search } from "lucide-react";
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
const ranges = [7, 30] as const;

/**
 * Real quotes for one item in three cities plus its recorded daily trend, loaded from the
 * same endpoints as the Market Explorer once the card scrolls into view. The city and range
 * controls work; the search field is a door into the full explorer. Every quote keeps its
 * own source time; a city without an observation stays "Unavailable".
 */
export function MarketPreview({
  item,
  cities,
  trendCities,
  suffix,
}: {
  item: { id: string; name: string; tier: string; kind: string };
  cities: readonly string[];
  trendCities: readonly string[];
  suffix: string;
}) {
  const region = useAtlasRegion();
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const [seen, setSeen] = useState(false);
  const [trendCity, setTrendCity] = useState(trendCities[0]);
  const [range, setRange] = useState<(typeof ranges)[number]>(30);
  const [priceResult, setPriceResult] = useState<Keyed<MarketPrice[]> | null>(null);
  const [trendResult, setTrendResult] = useState<Keyed<Point[]> | null>(null);
  const quality = 1;
  const priceKey = `${region}:${item.id}:${quality}`;
  const trendKey = `${priceKey}:${trendCity}`;
  // Loading is derived from the keys so the effects never set state synchronously.
  const prices: Load<MarketPrice[]> = !seen
    ? { status: "idle" }
    : priceResult?.key === priceKey
      ? priceResult.value
      : { status: "loading" };
  const trend: Load<Point[]> = !seen
    ? { status: "idle" }
    : trendResult?.key === trendKey
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
    fetch(`/api/market?${new URLSearchParams(params)}`, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Market data is unavailable.");
        const parsed = quotes.parse(body);
        setPriceResult({
          key: priceKey,
          value: {
            status: "ready",
            data: parsed.prices.filter((p) => p.item_id === item.id && p.quality === quality),
            fetchedAt: Date.now(),
          },
        });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setPriceResult({
          key: priceKey,
          value: { status: "error", message: e instanceof Error ? e.message : "Unavailable" },
        });
      });
    return () => controller.abort();
  }, [seen, priceKey, region, item.id]);

  useEffect(() => {
    if (!seen) return;
    const controller = new AbortController();
    const params = { kind: "history", region, item: item.id, quality: String(quality) };
    fetch(`/api/history?${new URLSearchParams({ ...params, city: trendCity })}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "History is unavailable.");
        const rows = history.parse(body).data[0]?.data ?? [];
        setTrendResult({
          key: trendKey,
          value: {
            status: "ready",
            data: rows
              .filter((p) => p.avg_price > 0)
              .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
            fetchedAt: Date.now(),
          },
        });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setTrendResult({
          key: trendKey,
          value: { status: "error", message: e instanceof Error ? e.message : "Unavailable" },
        });
      });
    return () => controller.abort();
  }, [seen, trendKey, region, item.id, trendCity]);

  const now = prices.status === "ready" ? prices.fetchedAt : 0;
  return (
    <div ref={root} className="market-preview">
      <div className="preview-controls">
        <Link href={`/tools/market${suffix}`} className="preview-search">
          <Search size={15} aria-hidden="true" />
          <span>Search for an item…</span>
        </Link>
      </div>
      <div className="market-preview-item">
        <ItemIcon id={item.id} size={48} />
        <div>
          <strong>{item.name}</strong>
          <span>
            {item.tier} · {item.kind} · {regions[region].label}
          </span>
        </div>
      </div>
      <div className="market-preview-head">
        <span className="build-preview-label">City prices</span>
        <div className="preview-tabs" role="tablist" aria-label="Trend range">
          {ranges.map((days) => (
            <button
              key={days}
              type="button"
              role="tab"
              id={`${id}-${days}`}
              aria-selected={range === days}
              onClick={() => setRange(days)}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>
      <table className="market-preview-table">
        <thead>
          <tr>
            <th scope="col">City</th>
            <th scope="col" className="is-number">
              Sell
            </th>
            <th scope="col" className="is-number">
              Buy
            </th>
            <th scope="col">Last seen</th>
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
              <tr key={city}>
                <th scope="row">
                  <span className="city-dot" data-city={city} aria-hidden="true" />
                  {city}
                </th>
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
      <Trend city={trendCity} state={trend} range={range}>
        <label className="preview-select is-inline">
          <span className="sr-only">Trend city</span>
          <select value={trendCity} onChange={(e) => setTrendCity(e.target.value)}>
            {trendCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
      </Trend>
    </div>
  );
}

function Trend({
  city,
  state,
  range,
  children,
}: {
  city: string;
  state: Load<Point[]>;
  range: number;
  children?: ReactNode;
}) {
  const all = state.status === "ready" ? state.data : [];
  const since = (state.status === "ready" ? state.fetchedAt : 0) - range * 86400000;
  const points = all.filter((p) => Date.parse(p.timestamp + "Z") >= since);
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
        <span className="market-preview-caption">
          <strong>{range}-day average</strong> {children}
        </span>
        {points.length > 1 && (
          <span className="market-preview-range">
            {silver(Math.round(low))} – {silver(Math.round(high))}
          </span>
        )}
      </figcaption>
      {points.length > 1 ? (
        <div className="market-preview-plot">
          <div className="market-preview-y" aria-hidden="true">
            <span>{silver(Math.round(high))}</span>
            <span>{silver(Math.round((high + low) / 2))}</span>
            <span>{silver(Math.round(low))}</span>
          </div>
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
        </div>
      ) : (
        <p className="market-preview-empty">
          {state.status === "loading" || state.status === "idle"
            ? "Loading recorded history…"
            : state.status === "error"
              ? "History unavailable. Nothing has been substituted."
              : `No daily history recorded for ${city} in the last ${range} days.`}
        </p>
      )}
      {first && last && points.length > 1 && (
        <div className="market-preview-axis" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span key={t}>{day(points[Math.round(t * (points.length - 1))])}</span>
          ))}
        </div>
      )}
    </figure>
  );
}
