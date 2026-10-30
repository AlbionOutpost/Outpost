"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAtlasRegion } from "@/components/region-context";
import { regions } from "@/lib/albion/region-config";
import { sourceAge } from "@/lib/albion/source-age";

const gold = z.object({
  data: z.array(z.object({ price: z.number(), timestamp: z.string() })).max(1000),
});
type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; points: { price: number; timestamp: string }[]; fetchedAt: number };

/**
 * The gold price for the selected region over the last seven days, from the same history
 * endpoint as the Market Explorer. One request per region; nothing is drawn without data.
 */
export function GoldTicker() {
  const region = useAtlasRegion();
  const [result, setResult] = useState<{ region: string; value: State } | null>(null);
  const state: State = result?.region === region ? result.value : { status: "loading" };
  useEffect(() => {
    const controller = new AbortController();
    const setState = (value: State) => setResult({ region, value });
    fetch(`/api/history?${new URLSearchParams({ kind: "gold", region })}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const points = gold
          .parse(await r.json())
          .data.filter((p) => p.price > 0)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        setState({ status: "ready", points, fetchedAt: Date.now() });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [region]);

  const points = state.status === "ready" ? state.points : [];
  const last = points.at(-1);
  const dayAgo = points.length > 24 ? points[points.length - 25] : undefined;
  const change = last && dayAgo ? ((last.price - dayAgo.price) / dayAgo.price) * 100 : null;
  const width = 160,
    height = 40;
  let path = "";
  if (points.length > 1) {
    const low = Math.min(...points.map((p) => p.price)),
      high = Math.max(...points.map((p) => p.price)),
      span = high - low || 1;
    path = points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${((i / (points.length - 1)) * width).toFixed(1)} ${(height - 3 - ((p.price - low) / span) * (height - 6)).toFixed(1)}`,
      )
      .join(" ");
  }
  const age = last
    ? sourceAge(last.timestamp, state.status === "ready" ? state.fetchedAt : 0)
    : null;
  return (
    <div className="gold-ticker" aria-live="polite">
      <div className="gold-ticker-head">
        <span className="gold-ticker-label">Gold · {regions[region].label}</span>
        {age?.known && (
          <time dateTime={last!.timestamp} className={age.stale ? "is-stale" : undefined}>
            {age.label}
          </time>
        )}
      </div>
      <div className="gold-ticker-body">
        <div>
          <strong>
            {last ? last.price.toLocaleString("en-US") : state.status === "error" ? "—" : "…"}
          </strong>
          <span>
            {last
              ? change == null
                ? "silver per gold"
                : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}% in 24 h`
              : state.status === "error"
                ? "Gold history unavailable"
                : "Loading gold history…"}
          </span>
        </div>
        {path && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Gold price over the last ${Math.round(points.length / 24)} days`}
          >
            <path
              d={path}
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth="1.75"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
