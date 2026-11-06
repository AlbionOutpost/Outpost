"use client";
import "./history.css";
import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { cities, regions } from "@/lib/albion/region-config";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
type Point = { price: number; timestamp: string; count?: number };
export function History({
  kind = "history",
  item = "T4_BAG",
  quality = 1,
  autoLoad = false,
  embedded = false,
  city: controlledCity,
  onCityChange,
}: {
  kind?: "history" | "gold";
  item?: string;
  quality?: number;
  /** Load the current selection as soon as it changes instead of waiting for the button. */
  autoLoad?: boolean;
  /** Render inside a host panel: no panel chrome, heading or description of its own. */
  embedded?: boolean;
  /** History city owned by the host (the market page follows the selected city row). */
  city?: string;
  onCityChange?: (city: string) => void;
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
  const current = `${kind}:${region}:${item}:${quality}:${city}`;
  const busy = pendingKey === current;
  const failed = !busy && errorKey === current;
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
  async function load() {
    request.current?.abort();
    const active = new AbortController();
    request.current = active;
    setPendingKey(current);
    setErrorKey("");
    setPoints([]);
    setKey("");
    try {
      const p = new URLSearchParams({
        kind,
        region,
        item: item.toUpperCase(),
        quality: String(quality),
        city,
      });
      const res = await fetch(`/api/history?${p}`, { signal: active.signal });
      const body = await res.json();
      if (active.signal.aborted) return;
      if (!res.ok) throw new Error(body.error);
      const rows: Point[] =
        kind === "gold"
          ? body.data
          : body.data.flatMap(
              (r: { data: { avg_price: number; timestamp: string; item_count: number }[] }) =>
                r.data.map((v) => ({
                  price: v.avg_price,
                  timestamp: v.timestamp,
                  count: v.item_count,
                })),
            );
      setPoints(rows.sort((a, b) => sourceTimestamp(a.timestamp) - sourceTimestamp(b.timestamp)));
      setKey(current);
    } catch {
      if (active.signal.aborted) return;
      setErrorKey(current);
    } finally {
      if (request.current === active) setPendingKey(null);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    if (!autoLoad) return;
    const timer = window.setTimeout(() => void loadRef.current(), 150);
    return () => window.clearTimeout(timer);
  }, [autoLoad, current]);
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
  // Hourly series (gold) label the time of day; daily series label the date.
  const hourly = kind === "gold" || end - start < 2 * 86_400_000;
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
  const status = busy
    ? "Loading history…"
    : failed
      ? "History could not load. Refresh to try again."
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
          {kind === "history" && visible.length > 0 && (
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
          )}
          {refresh}
        </form>
      )}
      {kind === "gold" && (
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
                  {point ? point.price.toLocaleString("en-US") : <Unavailable />}
                </b>
                {point && <small>{stamp(point.timestamp)}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="history-chart">
        <div className="history-chart-head">
          <span className="history-series-key">
            {kind === "gold"
              ? `Silver per gold · ${regions[region].label}`
              : `Daily sell-order average · ${city}`}
          </span>
          {last && kind === "history" && (
            <span className="history-last">
              <b className="numeric">{last.price.toLocaleString("en-US")}</b>
              <small>{day(last.timestamp)}</small>
            </span>
          )}
        </div>
        <div className="reference-price-figure">
          <div className="reference-price-axis" aria-hidden="true">
            {(visible.length ? [max, (min + max) / 2, min] : [0, 1, 2]).map((price, i) => (
              <span key={i} title={visible.length ? `${price} silver` : undefined}>
                {visible.length ? compact(price) : "—"}
              </span>
            ))}
          </div>
          <div className="history-plot">
            <svg
              role="img"
              aria-label={
                visible.length
                  ? `${kind} observed price chart, minimum ${min}, maximum ${max} silver. Full values in the observations list.`
                  : `${kind} price chart, no observations shown`
              }
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
              {[0, 0.5, 1].map((fraction) => (
                <line
                  key={fraction}
                  x1="0"
                  x2="700"
                  y1={Y1 - fraction * (Y1 - Y0)}
                  y2={Y1 - fraction * (Y1 - Y0)}
                  className="history-grid"
                />
              ))}
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
              {visible.map((p, i) => (
                <circle key={i} cx={coords[i].x} cy={coords[i].y} r="3">
                  <title>
                    {p.timestamp} UTC: {p.price} silver
                  </title>
                </circle>
              ))}
            </svg>
            {status && (
              <div className="history-status">
                <StatusLine tone={failed ? "error" : "default"}>{status}</StatusLine>
              </div>
            )}
          </div>
        </div>
        <div className="chart-range" aria-hidden="true">
          {visible.length ? (
            (visible.length > 4 ? [0, 0.25, 0.5, 0.75, 1] : [0, 1])
              .map((f) => visible[Math.round(f * (visible.length - 1))])
              .map((p, i) => <span key={i}>{day(p.timestamp)}</span>)
          ) : (
            <>
              <span>—</span>
              <span>—</span>
            </>
          )}
        </div>
      </div>
      {visible.length > 0 && (
        <Disclosure summary={`View ${visible.length} source observations`}>
          <div
            className="table-scroll history-observations"
            tabIndex={0}
            role="region"
            aria-label="Scrollable historical observations"
          >
            <table>
              <thead>
                <tr>
                  <th>Observed at (UTC)</th>
                  <th className="numeric">Silver</th>
                  {kind === "history" && <th className="numeric">Item count</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => (
                  <tr key={i}>
                    <td>{p.timestamp.replace("T", " ")}</td>
                    <td className="numeric">{p.price.toLocaleString()}</td>
                    {kind === "history" && <td className="numeric">{p.count?.toLocaleString()}</td>}
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
