"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { useAtlasRegion } from "@/components/region-context";
import { sourceAge } from "@/lib/albion/source-age";

const payload = z.object({
  city: z.string(),
  fetchedAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      sell: z.number().nullable(),
      observedAt: z.string().nullable(),
      days: z.array(z.object({ avg: z.number(), at: z.string() })),
      change: z.number().nullable(),
    }),
  ),
});
type Payload = z.infer<typeof payload>;
type State =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Payload; fetchedAt: number };
export type StripItem = { id: string; name: string };

const silver = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)} m`
    : n >= 100_000
      ? `${Math.round(n / 1000).toLocaleString("en-US")} k`
      : Math.round(n).toLocaleString("en-US");

function Spark({ days }: { days: { avg: number }[] }) {
  if (days.length < 2) return <span className="is-missing">—</span>;
  const w = 64;
  const h = 18;
  const values = days.map((d) => d.avg);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const points = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - low) / span) * (h - 4)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" focusable="false">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Five items quoted in one city with their seven-day movement, from two source requests.
 * The city select re-quotes; every row carries its own observation time; nothing is estimated.
 */
export function MarketStrip({
  items,
  cities,
  suffix,
}: {
  items: readonly StripItem[];
  cities: readonly string[];
  suffix: string;
}) {
  const region = useAtlasRegion();
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [city, setCity] = useState(cities[0]);
  const [result, setResult] = useState<{ key: string; value: State } | null>(null);
  const key = `${region}:${city}`;
  const state: State = !seen
    ? { status: "idle" }
    : result?.key === key
      ? result.value
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
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    const controller = new AbortController();
    const setState = (value: State) => setResult({ key, value });
    const params = { region, city, items: items.map((i) => i.id).join(",") };
    fetch(`/api/landing/market?${new URLSearchParams(params)}`, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Market observations unavailable.");
        setState({ status: "ready", data: payload.parse(body), fetchedAt: Date.now() });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: e instanceof Error ? e.message : "Unavailable" });
      });
    return () => controller.abort();
  }, [seen, key, region, city, items]);

  const data = state.status === "ready" ? state.data : null;
  const now = state.status === "ready" ? state.fetchedAt : 0;
  const rows = new Map(data?.items.map((i) => [i.id, i]));
  return (
    <div ref={root} className={`market-strip${state.status === "loading" ? " is-loading" : ""}`}>
      <div className="strip-bar">
        <span className="strip-title">Market</span>
        <label className="preview-select is-inline">
          <span className="sr-only">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="market-strip-table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className="is-number">
              Sell
            </th>
            <th scope="col" className="is-number">
              7d
            </th>
            <th scope="col">
              <span className="sr-only">Seven-day trend</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const row = rows.get(item.id);
            const age = row ? sourceAge(row.observedAt, now) : null;
            const change = row?.change ?? null;
            return (
              <tr key={item.id}>
                <th scope="row">
                  <Link href={`/tools/market?item=${item.id}&quality=1${suffix.replace("?", "&")}`}>
                    <ItemIcon id={item.id} size={24} />
                    <span>{item.name}</span>
                  </Link>
                </th>
                <td className="is-number">
                  {row?.sell != null ? (
                    <time
                      dateTime={row.observedAt ?? undefined}
                      title={age?.known ? `Seen ${age.label}` : undefined}
                      className={age?.stale ? "is-stale" : undefined}
                    >
                      {silver(row.sell)}
                    </time>
                  ) : (
                    <span className="is-missing">{data ? "—" : "…"}</span>
                  )}
                </td>
                <td
                  className={`is-number${change == null ? "" : change >= 0 ? " is-gain" : " is-loss"}`}
                >
                  {change == null
                    ? "—"
                    : `${change >= 0 ? "+" : "−"}${Math.abs(change * 100).toFixed(0)}%`}
                </td>
                <td className="market-strip-spark">
                  <Spark days={row?.days ?? []} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="strip-note">
        {state.status === "error"
          ? state.message
          : data
            ? `${data.city} sell orders · 7d from daily averages`
            : "Loading quotes…"}
      </p>
    </div>
  );
}
