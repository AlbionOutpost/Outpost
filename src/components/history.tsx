"use client";
import { useEffect, useRef, useState } from "react";
import { useAtlasRegion } from "./region-context";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { cities } from "@/lib/albion/region-config";
type Point = { price: number; timestamp: string; count?: number };
export function History({
  kind = "history",
  item = "T4_BAG",
  quality = 1,
}: {
  kind?: "history" | "gold";
  item?: string;
  quality?: number;
}) {
  const region = useAtlasRegion();
  const [city, setCity] = useState("Lymhurst");
  const [points, setPoints] = useState<Point[]>([]);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [loaded, setLoaded] = useState(false);
  const current = `${kind}:${region}:${item}:${quality}:${city}`;
  const busy = pendingKey === current;
  useEffect(() => () => request.current?.abort(), [current]);
  const visible = key === current ? points : [];
  async function load(e: React.FormEvent) {
    e.preventDefault();
    request.current?.abort();
    const active = new AbortController();
    request.current = active;
    setPendingKey(current);
    setError("");
    setPoints([]);
    setLoaded(false);
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
      setLoaded(true);
    } catch (e) {
      if (active.signal.aborted) return;
      setErrorKey(current);
      setError(e instanceof Error ? e.message : "Unable to load history");
    } finally {
      if (request.current === active) setPendingKey(null);
    }
  }
  const min = visible.length ? Math.min(...visible.map((p) => p.price)) : 0,
    max = visible.length ? Math.max(...visible.map((p) => p.price)) : 0;
  const start = visible.length ? sourceTimestamp(visible[0].timestamp) : 0,
    end = visible.length ? sourceTimestamp(visible[visible.length - 1].timestamp) : 0;
  const xy = visible
    .map(
      (p) =>
        `${25 + ((sourceTimestamp(p.timestamp) - start) / Math.max(1, end - start)) * 650},${175 - ((p.price - min) / Math.max(1, max - min)) * 145}`,
    )
    .join(" ");
  return (
    <section className="panel history-panel">
      <h2>{kind === "gold" ? "Gold price observations" : "Historical sell-order averages"}</h2>
      <p>
        {kind === "gold"
          ? "Up to 168 recent gold observations. Coverage varies by region."
          : `Daily sell-order averages for ${item.toUpperCase()}, quality ${quality}, over the previous 30 days. These are not confirmed transaction prices.`}
      </p>
      <form onSubmit={load} className="market-form">
        {kind === "history" && (
          <label>
            History city
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <button className="button secondary" disabled={busy}>
          {busy ? "Fetching history…" : "Load historical observations"}
        </button>
      </form>
      {error && errorKey === current && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {visible.length > 0 ? (
        <>
          <svg
            role="img"
            aria-label={`${kind} observed price chart, minimum ${min}, maximum ${max} silver. Full values in table below.`}
            viewBox="0 0 700 210"
            className="price-chart"
          >
            <line x1="25" x2="675" y1="180" y2="180" stroke="currentColor" opacity=".2" />
            <polyline points={xy} fill="none" stroke="#d9b777" strokeWidth="2" />
            {visible.map((p, i) => (
              <circle
                key={i}
                cx={25 + ((sourceTimestamp(p.timestamp) - start) / Math.max(1, end - start)) * 650}
                cy={175 - ((p.price - min) / Math.max(1, max - min)) * 145}
                r="3"
                fill="#d9b777"
              >
                <title>
                  {p.timestamp} UTC: {p.price} silver
                </title>
              </circle>
            ))}
          </svg>
          <div className="chart-range">
            <span>{visible[0].timestamp.replace("T", " ")} UTC</span>
            <span>{visible[visible.length - 1].timestamp.replace("T", " ")} UTC</span>
          </div>
          <details>
            <summary>View {visible.length} source observations</summary>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Scrollable historical observations"
            >
              <table>
                <thead>
                  <tr>
                    <th>Observed at (UTC)</th>
                    <th>Silver</th>
                    {kind === "history" && <th>Item count</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p, i) => (
                    <tr key={i}>
                      <td>{p.timestamp.replace("T", " ")}</td>
                      <td>{p.price.toLocaleString()}</td>
                      {kind === "history" && <td>{p.count?.toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p className="empty">
          {loaded && key === current
            ? "No historical observations available."
            : "Load source observations to view the chart."}
        </p>
      )}
      <small className="muted">
        Albion Online Data Project · Five-minute application cache · Gaps in coverage are not filled
        with invented values.
      </small>
    </section>
  );
}
