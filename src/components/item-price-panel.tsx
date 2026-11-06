"use client";
import { Silver } from "@/components/silver";
import Link from "@/components/link";
import { useEffect, useState } from "react";
import { ArrowRight, RotateCw } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import type { MarketPrice } from "@/lib/albion/market-client";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { sourceAge } from "@/lib/albion/source-age";
import { cities, regions } from "@/lib/albion/region-config";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";

type State =
  | { status: "loading"; key: string }
  | { status: "error"; key: string }
  | { status: "ready"; key: string; rows: MarketPrice[]; at: number };

function stamp(value: string) {
  const time = sourceTimestamp(value);
  if (!Number.isFinite(time)) return "Unknown time";
  const iso = new Date(time).toISOString();
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
}

/**
 * Normal-quality city observations for one item, loaded on arrival so the item page answers
 * "what does it cost" without a detour. Each quote keeps its city, source time and freshness;
 * the table keeps its shape while there is nothing to show, and the reason is said once.
 */
export function ItemPricePanel({ id }: { id: string }) {
  const region = useOutpostRegion();
  const quality = 1;
  const [attempt, setAttempt] = useState(0);
  const key = `${region}:${id}:${quality}:${attempt}`;
  const [settled, setSettled] = useState<State | null>(null);
  // A stale key means a new selection is in flight; the old answer is never shown for it.
  const state: State = settled && settled.key === key ? settled : { status: "loading", key };
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/market?${new URLSearchParams({ region, item: id, quality: String(quality) })}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load prices");
        if (data.region !== region) throw new Error("Source region mismatch");
        setSettled({ status: "ready", key, rows: data.prices as MarketPrice[], at: Date.now() });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSettled({ status: "error", key });
      });
    return () => controller.abort();
  }, [region, id, key]);
  const rows = state.status === "ready" ? state.rows : [];
  const summary = summarizeQuotes(rows);
  const observed = rows
    .filter((row) => row.sell_price_min > 0 || row.buy_price_max > 0)
    .toSorted((a, b) => a.city.localeCompare(b.city));
  const tableRows = observed.length ? observed : null;
  const label = regions[region as keyof typeof regions]?.label ?? region;
  const now = state.status === "ready" ? state.at : 0;
  const newest = observed
    .flatMap((r) => [
      ...(r.sell_price_min ? [{ city: r.city, date: r.sell_price_min_date }] : []),
      ...(r.buy_price_max ? [{ city: r.city, date: r.buy_price_max_date }] : []),
    ])
    .filter((o) => Number.isFinite(sourceTimestamp(o.date)))
    .reduce<{ city: string; date: string } | null>(
      (best, o) => (!best || sourceTimestamp(o.date) > sourceTimestamp(best.date) ? o : best),
      null,
    );
  const status =
    state.status === "loading"
      ? "Loading city prices…"
      : state.status === "error"
        ? "Prices could not load right now."
        : !summary.available
          ? `No orders seen for this item on ${label} yet. A gap is not a zero price.`
          : "";
  const figure = (
    label: string,
    row: MarketPrice | null,
    value: number | undefined,
    date: string | undefined,
  ) => (
    <div>
      <dt>{label}</dt>
      <dd>
        {row && value ? (
          <>
            <strong className="numeric">
              <Silver value={value} />
            </strong>
            <small>
              <span className="city-dot" data-city={row.city} aria-hidden="true" />
              {row.city} · {stamp(date ?? "")} UTC
              {isStale(date ?? "") ? " · stale" : ""}
            </small>
          </>
        ) : (
          <strong>
            <Unavailable label={state.status === "loading" ? "Loading" : "Unavailable"} />
          </strong>
        )}
      </dd>
    </div>
  );
  return (
    <section
      className="raised item-panel item-price-panel"
      aria-labelledby="item-prices-heading"
      aria-busy={state.status === "loading"}
    >
      <PanelHead
        id="item-prices-heading"
        title="Market prices"
        line={`Normal quality · ${label} · the newest order seen in each city`}
      />
      <dl className="item-price-summary">
        {figure(
          "Lowest sell order",
          summary.ask,
          summary.ask?.sell_price_min,
          summary.ask?.sell_price_min_date,
        )}
        {figure(
          "Highest buy order",
          summary.bid,
          summary.bid?.buy_price_max,
          summary.bid?.buy_price_max_date,
        )}
        <div>
          <dt>Newest observation</dt>
          <dd>
            {newest ? (
              <>
                <strong>{sourceAge(newest.date, now).label}</strong>
                <small>
                  <span className="city-dot" data-city={newest.city} aria-hidden="true" />
                  {newest.city} · {stamp(newest.date)} UTC
                </small>
              </>
            ) : (
              <strong>
                <Unavailable label={state.status === "loading" ? "Loading" : "Unavailable"} />
              </strong>
            )}
          </dd>
        </div>
      </dl>
      {status && (
        <div className="item-price-status">
          <StatusLine tone={state.status === "error" ? "error" : "default"}>{status}</StatusLine>
          {state.status === "error" && (
            <button
              type="button"
              className="pill-link is-small"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RotateCw size={14} aria-hidden="true" />
              Try again
            </button>
          )}
          {state.status === "ready" && !summary.available && (
            <Link
              className="pill-link is-small"
              href={`/market-data?${new URLSearchParams({ region, item: id })}`}
            >
              Fill a missing price <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
      <div
        className="table-scroll item-price-well"
        role="region"
        aria-label="City price observations"
        tabIndex={0}
      >
        <table className="item-price-table">
          <thead>
            <tr>
              <th scope="col">City</th>
              <th scope="col" className="numeric">
                Sell order
              </th>
              <th scope="col" className="numeric">
                Buy order
              </th>
            </tr>
          </thead>
          <tbody>
            {(tableRows ?? cities.map((city) => ({ city }) as Partial<MarketPrice>)).map((row) => (
              <tr key={row.city}>
                <th scope="row">
                  <span className="city-dot" data-city={row.city} aria-hidden="true" />
                  {row.city}
                </th>
                {(
                  [
                    [row.sell_price_min, row.sell_price_min_date],
                    [row.buy_price_max, row.buy_price_max_date],
                  ] as const
                ).map(([value, date], index) => (
                  <td className="numeric" key={index}>
                    {value && date ? (
                      <>
                        <Silver value={value} />
                        <small>
                          {stamp(date)}
                          {isStale(date) ? " · stale" : ""}
                        </small>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="item-price-source">
        Albion Online Data Project · times in UTC · older than an hour is marked stale. Other
        qualities and price history are in Market Explorer.
      </p>
    </section>
  );
}
