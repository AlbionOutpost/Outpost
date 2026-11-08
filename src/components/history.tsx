"use client";
import "./history.css";
import "./market-table.css";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { cities, regions } from "@/lib/albion/region-config";
import { Disclosure } from "./disclosure";
import { Silver } from "./silver";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import { Skeleton } from "./market-city-table";
import { marketHistoryCache, withSignal } from "@/lib/client-json-cache";
type Point = { price: number; timestamp: string; count?: number };
type SourceSeries = { data: { avg_price: number; timestamp: string; item_count: number }[] };
type HistoryAnswer = { data: Point[] | SourceSeries[] };
export function History({
  kind = "history",
  item = "T4_BAG",
  quality = 1,
  autoLoad = false,
  delay = 150,
  embedded = false,
  city: controlledCity,
  onCityChange,
  actions,
}: {
  kind?: "history" | "gold";
  item?: string;
  quality?: number;
  /** Load the current selection as soon as it changes instead of waiting for the button. */
  autoLoad?: boolean;
  /** How long autoLoad waits for the selection to settle (a typed identifier) before asking. */
  delay?: number;
  /** Render inside a host panel: no panel chrome, heading or description of its own. */
  embedded?: boolean;
  /** History city owned by the host (the market page follows the selected city row). */
  city?: string;
  onCityChange?: (city: string) => void;
  /** Host controls that sit at the end of the controls row, beside Refresh. */
  actions?: ReactNode;
}) {
  const region = useOutpostRegion();
  const [ownCity, setOwnCity] = useState("Lymhurst");
  const city = controlledCity ?? ownCity;
  const setCity = onCityChange ?? setOwnCity;
  const [points, setPoints] = useState<Point[]>([]);
  const [key, setKey] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  // The point under the pointer or keyboard focus: a crosshair and its date and price.
  const [active, setActive] = useState<number | null>(null);
  const current = `${kind}:${region}:${item}:${quality}:${city}`;
  const failed = pendingKey !== current && errorKey === current;
  // Auto-loading, the moment before the request goes out counts as loading too.
  const busy = pendingKey === current || (autoLoad && key !== current && !failed);
  const loaded = !busy && key === current;
  useEffect(() => () => request.current?.abort(), [current]);
  const returned = key === current ? points : [];
  const latest = returned.length ? sourceTimestamp(returned[returned.length - 1].timestamp) : 0;
  const visible =
    kind === "history"
      ? returned.filter(
          (point) => sourceTimestamp(point.timestamp) >= latest - rangeDays * 86400000,
        )
      : returned;
  async function load({ fresh = false }: { fresh?: boolean } = {}) {
    request.current?.abort();
    const active = new AbortController();
    request.current = active;
    const p = new URLSearchParams({
      kind,
      region,
      item: item.toUpperCase(),
      quality: String(quality),
      city,
    });
    const source = `/api/history?${p}`;
    setErrorKey("");
    const show = (body: HistoryAnswer) => {
      const rows: Point[] =
        kind === "gold"
          ? (body.data as Point[])
          : (body.data as SourceSeries[]).flatMap((r) =>
              r.data.map((v) => ({
                price: v.avg_price,
                timestamp: v.timestamp,
                count: v.item_count,
              })),
            );
      setPoints(rows.sort((a, b) => sourceTimestamp(a.timestamp) - sourceTimestamp(b.timestamp)));
      setKey(current);
    };
    // A series this browser fetched within the server's cache life draws at once.
    const kept = fresh ? undefined : (marketHistoryCache.peek(source) as HistoryAnswer | undefined);
    if (kept) {
      setPendingKey(null);
      show(kept);
      return;
    }
    setPendingKey(current);
    setPoints([]);
    setKey("");
    try {
      const body = (await withSignal(
        marketHistoryCache.get(source, { fresh }),
        active.signal,
      )) as HistoryAnswer;
      if (active.signal.aborted) return;
      show(body);
    } catch {
      if (active.signal.aborted) return;
      setErrorKey(current);
    } finally {
      if (request.current === active) setPendingKey(null);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load({ fresh: true });
  }
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    if (!autoLoad) return;
    const timer = window.setTimeout(() => void loadRef.current(), delay);
    return () => window.clearTimeout(timer);
  }, [autoLoad, current, delay]);
  const min = visible.length ? Math.min(...visible.map((p) => p.price)) : 0,
    max = visible.length ? Math.max(...visible.map((p) => p.price)) : 0;
  const start = visible.length ? sourceTimestamp(visible[0].timestamp) : 0,
    end = visible.length ? sourceTimestamp(visible[visible.length - 1].timestamp) : 0;
  // Plot area inside a 700×210 box: values span 30→175 vertically, x keeps a gutter either side.
  const X0 = 12,
    X1 = 688,
    Y0 = 30,
    Y1 = 175;
  const at = (p: Point) => ({
    x: X0 + ((sourceTimestamp(p.timestamp) - start) / Math.max(1, end - start)) * (X1 - X0),
    y: Y1 - ((p.price - min) / Math.max(1, max - min)) * (Y1 - Y0),
  });
  const coords = visible.map(at);
  const xy = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = coords.length
    ? `M${coords[0].x.toFixed(1)} 200 L${xy.replaceAll(" ", " L")} L${coords[coords.length - 1].x.toFixed(1)} 200 Z`
    : "";
  // Full figures below 100k so neighbouring ticks never read the same; compact above.
  const compact = (price: number) =>
    price.toLocaleString(
      "en-US",
      price >= 100_000
        ? { notation: "compact", maximumFractionDigits: max - min < max * 0.05 ? 2 : 1 }
        : { maximumFractionDigits: 0 },
    );
  // A series inside two days labels the time of day; anything longer labels the date.
  const hourly = end - start < 2 * 86_400_000;
  const day = (t: string) =>
    hourly
      ? `${new Date(sourceTimestamp(t)).toISOString().slice(11, 16)} UTC`
      : new Date(sourceTimestamp(t)).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        });
  const stamp = (t: string) =>
    `${new Date(sourceTimestamp(t)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} · ${new Date(sourceTimestamp(t)).toISOString().slice(11, 16)} UTC`;
  const last = visible.at(-1);
  const low = visible.length
    ? visible.reduce((best, p) => (p.price < best.price ? p : best))
    : undefined;
  const high = visible.length
    ? visible.reduce((best, p) => (p.price > best.price ? p : best))
    : undefined;
  const gradient = `history-fill-${kind}`;
  const hover = active !== null && active < visible.length ? active : null;
  const pointAt = (clientX: number, plot: HTMLElement) => {
    const box = plot.getBoundingClientRect();
    const x = ((clientX - box.left) / Math.max(1, box.width)) * 700;
    let best = 0;
    coords.forEach((c, i) => {
      if (Math.abs(c.x - x) < Math.abs(coords[best].x - x)) best = i;
    });
    return best;
  };
  const onPlotKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = hover ?? visible.length - 1;
    const next =
      e.key === "ArrowLeft"
        ? Math.max(0, from - 1)
        : e.key === "ArrowRight"
          ? Math.min(visible.length - 1, from + 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? visible.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  };
  // Five value lines (top, quarters, bottom), each labelled on the axis
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const grid = ticks.map((fraction) => (
    <line
      key={fraction}
      x1="0"
      x2="700"
      y1={Y1 - fraction * (Y1 - Y0)}
      y2={Y1 - fraction * (Y1 - Y0)}
      className="history-grid"
    />
  ));
  const tickTop = (fraction: number) =>
    ({ "--tick-y": `${((Y1 - fraction * (Y1 - Y0)) / 210) * 100}%` }) as React.CSSProperties;
  const range = kind === "history" && (
    <div className="history-range" role="group" aria-label="History date range">
      {[7, 30].map((days) => (
        <button
          type="button"
          aria-pressed={rangeDays === days}
          key={days}
          onClick={() => setRangeDays(days)}
        >
          {days} days
        </button>
      ))}
    </div>
  );
  // Market history while a series loads: the chart's skeleton (gold keeps its empty frame).
  const skeleton = kind === "history" && busy && !visible.length;
  const status = busy
    ? "Loading history…"
    : failed
      ? "History could not load right now."
      : loaded && !visible.length
        ? kind === "gold"
          ? "No gold observations for this server yet. A gap is not a zero price."
          : `No sell-order history in ${city} for this item yet. Try another city.`
        : !visible.length
          ? autoLoad
            ? "History loads as soon as you pick a city."
            : "Load the history to see how the price moved."
          : "";
  const refresh = (
    <button className="pill-link is-small history-refresh" disabled={busy}>
      <RotateCw size={14} aria-hidden="true" />
      {busy ? "Loading…" : autoLoad ? "Refresh history" : "Load history"}
    </button>
  );
  const body = (
    <>
      {(kind === "history" || embedded) && (
        <form onSubmit={submit} className="history-controls">
          {kind === "history" && (
            <label className="history-city">
              <span>History city</span>
              <WellSelect value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </WellSelect>
            </label>
          )}
          {refresh}
          {actions}
        </form>
      )}
      {!visible.length && kind === "gold" && (
        // The figures and chart keep their places while there is nothing to show
        <dl className="history-figures">
          {["Latest", "Lowest", "Highest"].map((label) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <b className="numeric">
                  <Unavailable />
                </b>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {skeleton && (
        // The next series is on its way: the chart keeps its frame, axis and footer while the
        // figures shimmer, so the panel neither collapses nor shows the previous item's line.
        <>
          <div className="history-chart is-loading">
            <div className="history-range-slot">{range}</div>
            <div className="history-chart-head" aria-hidden="true">
              <span className="history-last">
                <b className="numeric">
                  <Skeleton>0,000</Skeleton>
                </b>
                <small>
                  <Skeleton>Lymhurst · 00 Mon</Skeleton>
                </small>
              </span>
            </div>
            <div className="reference-price-figure" aria-hidden="true">
              <div className="reference-price-axis">
                {ticks.map((fraction) => (
                  <span key={fraction} style={tickTop(fraction)}>
                    <Skeleton>0,000</Skeleton>
                  </span>
                ))}
              </div>
              <div className="history-plot">
                <svg viewBox="0 0 700 210" preserveAspectRatio="none" className="price-chart">
                  {grid}
                </svg>
              </div>
            </div>
            <div className="chart-range" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i}>
                  <Skeleton>00 Mon</Skeleton>
                </span>
              ))}
            </div>
          </div>
          <p className="sr-only" role="status">
            {status}
          </p>
          <div inert aria-hidden="true">
            <Disclosure summary="View source observations">{null}</Disclosure>
          </div>
        </>
      )}
      {!visible.length && !skeleton && (
        // A failed load is one line with Try again; the empty chart frame is for waiting
        <div className={`history-state${kind === "gold" && !failed ? " is-chart" : ""}`}>
          {kind === "gold" && !failed && (
            <svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-hidden="true">
              {grid}
            </svg>
          )}
          <StatusLine tone={failed ? "error" : "default"}>{status}</StatusLine>
          {failed && (
            <button
              type="button"
              className="pill-link is-small"
              onClick={() => void load({ fresh: true })}
            >
              <RotateCw size={14} aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      )}
      {kind === "gold" && visible.length > 0 && (
        <dl className="history-figures">
          {(
            [
              ["Latest", last],
              ["Lowest", low],
              ["Highest", high],
            ] as const
          ).map(([label, point]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <b className="numeric">
                  {point ? <Silver value={point.price} /> : <Unavailable />}
                </b>
                {point && <small>{stamp(point.timestamp)}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {visible.length > 0 && (
        <div className="history-chart">
          <div className="history-range-slot">{range}</div>
          <div className="history-chart-head">
            {last && kind === "history" ? (
              // The current value: the newest daily sell-order average, its city and day
              <span className="history-last">
                <b className="numeric">{last.price.toLocaleString("en-US")}</b>
                <small>
                  {city} · {day(last.timestamp)}
                  <span className="sr-only">, latest daily sell-order average</span>
                </small>
              </span>
            ) : (
              <span className="history-series-key">
                {kind === "gold"
                  ? `Silver per gold · ${regions[region].label}`
                  : `Daily sell-order average · ${city}`}
              </span>
            )}
          </div>
          <div className="reference-price-figure">
            <div className="reference-price-axis" aria-hidden="true">
              {ticks.map((fraction) => {
                const price = min + fraction * (max - min);
                return (
                  <span key={fraction} style={tickTop(fraction)} title={`${price} silver`}>
                    {compact(price)}
                  </span>
                );
              })}
            </div>
            <div
              className="history-plot"
              role="group"
              tabIndex={0}
              aria-label="Price chart. Arrow keys read each observation."
              onPointerMove={(e) => setActive(pointAt(e.clientX, e.currentTarget))}
              onPointerLeave={() => setActive(null)}
              onKeyDown={onPlotKey}
              onFocus={() => setActive((a) => a ?? visible.length - 1)}
              onBlur={() => setActive(null)}
            >
              <svg
                role="img"
                aria-label={`${kind} observed price chart, minimum ${min}, maximum ${max} silver, ${visible.length} observations from ${stamp(visible[0].timestamp)} to ${stamp(visible[visible.length - 1].timestamp)}, latest ${visible[visible.length - 1].price} silver. Full values in the observations list.`}
                viewBox="0 0 700 210"
                preserveAspectRatio="none"
                className="price-chart"
              >
                <defs>
                  <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity=".32" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {grid}
                {coords.length > 1 && <path d={area} fill={`url(#${gradient})`} />}
                {coords.length > 0 && (
                  <polyline
                    points={xy}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* A zero-length round-capped stroke stays a circle however the plot stretches */}
                {visible.map((p, i) => (
                  <path
                    key={i}
                    className="history-point"
                    d={`M${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}h0`}
                  >
                    <title>
                      {p.timestamp} UTC: {p.price} silver
                    </title>
                  </path>
                ))}
              </svg>
              {hover !== null && (
                <span
                  className={`history-hover${coords[hover].x > 420 ? " is-flipped" : ""}`}
                  style={
                    {
                      "--hover-x": `${coords[hover].x / 7}%`,
                      "--hover-y": `${(coords[hover].y / 210) * 100}%`,
                    } as React.CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className="history-crosshair" />
                  <span className="history-dot" />
                  <span className="history-tip">
                    <b>
                      <Silver value={visible[hover].price} />
                    </b>
                    <small>
                      {hourly ? stamp(visible[hover].timestamp) : day(visible[hover].timestamp)}
                    </small>
                  </span>
                </span>
              )}
              <p className="sr-only" aria-live="polite">
                {hover !== null
                  ? `${stamp(visible[hover].timestamp)}: ${visible[hover].price.toLocaleString("en-US")} silver`
                  : ""}
              </p>
            </div>
          </div>
          <div className="chart-range" aria-hidden="true">
            {(visible.length > 4 ? [0, 0.25, 0.5, 0.75, 1] : [0, 1])
              .map((f) => visible[Math.round(f * (visible.length - 1))])
              .map((p, i) => (
                <span key={i}>{day(p.timestamp)}</span>
              ))}
          </div>
        </div>
      )}
      {visible.length > 0 && (
        <Disclosure summary={`View ${visible.length} source observations`}>
          <div
            className="table-scroll mx-table-well history-observations"
            tabIndex={0}
            role="region"
            aria-label="Scrollable historical observations"
          >
            <table className="mx-table is-compact">
              <thead>
                <tr>
                  <th scope="col">Observed at (UTC)</th>
                  <th scope="col" className="numeric">
                    Silver
                  </th>
                  {kind === "history" && (
                    <th scope="col" className="numeric">
                      Item count
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => (
                  <tr key={i}>
                    <td className="is-text">{p.timestamp.replace("T", " ")}</td>
                    <td className="numeric">{p.price.toLocaleString("en-US")}</td>
                    {kind === "history" && (
                      <td className="numeric">
                        {p.count == null ? <Unavailable /> : p.count.toLocaleString("en-US")}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}
      <p className="history-source">
        Albion Online Data Project · player observations, not confirmed trades · times in UTC
      </p>
    </>
  );
  return embedded ? (
    <div className="history-panel is-embedded">{body}</div>
  ) : (
    <section
      className={`raised history-panel${kind === "gold" ? " gold-research-workspace" : ""}`}
      aria-labelledby={`${kind}-history-title`}
    >
      <form onSubmit={submit}>
        <PanelHead
          id={`${kind}-history-title`}
          title={kind === "gold" ? "Silver per gold" : "Sell-order history"}
          line={
            kind === "gold"
              ? `Silver for one gold on ${regions[region].label}, up to 168 recent observations.`
              : `Daily sell-order averages for ${item.toUpperCase()}, quality ${quality}.`
          }
          actions={kind === "gold" ? refresh : undefined}
        />
      </form>
      {body}
    </section>
  );
}
