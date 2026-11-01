"use client";
import { Silver } from "@/components/silver";
import Link from "@/components/link";
import { useEffect, useState } from "react";
import { useAtlasRegion } from "./region-context";
import type { MarketPrice } from "@/lib/albion/market-client";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { summarizeQuotes } from "@/lib/albion/quote-summary";

type State =
  | { status: "loading"; key: string }
  | { status: "error"; key: string; message: string }
  | { status: "ready"; key: string; rows: MarketPrice[] };

const qualityNames = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];

function stamp(value: string) {
  const time = sourceTimestamp(value);
  if (!Number.isFinite(time)) return "Unknown time";
  const iso = new Date(time).toISOString();
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
}

/**
 * Normal-quality city observations for one item, loaded on arrival so the item page answers
 * "what does it cost" without a detour. Each quote keeps its city, source time and freshness.
 */
export function ItemPricePanel({ id }: { id: string }) {
  const region = useAtlasRegion();
  const quality = 1;
  const key = `${region}:${id}:${quality}`;
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
        setSettled({ status: "ready", key, rows: data.prices as MarketPrice[] });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          status: "error",
          key,
          message: error instanceof Error ? error.message : "Could not load prices",
        });
      });
    return () => controller.abort();
  }, [region, id, key]);
  const explorer = `/tools/market?${new URLSearchParams({ item: id, region })}`;
  const rows = state.status === "ready" ? state.rows : [];
  const summary = summarizeQuotes(rows);
  const observed = rows
    .filter((row) => row.sell_price_min > 0 || row.buy_price_max > 0)
    .toSorted((a, b) => a.city.localeCompare(b.city));
  return (
    <section
      className="item-price-panel"
      aria-labelledby="item-prices-heading"
      aria-busy={state.status === "loading"}
    >
      <div className="item-price-heading">
        <div>
          <h2 id="item-prices-heading">Market prices</h2>
          <p className="muted">
            {qualityNames[quality - 1]} quality · {region} · last player observations per city.
          </p>
        </div>
        <Link className="button secondary" href={explorer}>
          Open in Market Explorer
        </Link>
      </div>
      {state.status === "loading" && (
        <p className="item-price-state" role="status">
          Loading city observations…
        </p>
      )}
      {state.status === "error" && (
        <p className="item-price-state error" role="alert">
          {state.message}. No previous observation is shown in its place.
        </p>
      )}
      {state.status === "ready" && !summary.available && (
        <p className="item-price-state" role="status">
          No price observations for this item in {region}. Missing data is not a zero price.{" "}
          <Link
            className="text-link"
            href={`/market-data?${new URLSearchParams({ region, item: id })}`}
          >
            How coverage works →
          </Link>
        </p>
      )}
      {state.status === "ready" && summary.available > 0 && (
        <>
          <dl className="item-price-summary">
            <div>
              <dt>Lowest sell order</dt>
              <dd>
                {summary.ask ? (
                  <>
                    <strong className="numeric">
                      <Silver value={summary.ask.sell_price_min} />
                    </strong>
                    <small>
                      {summary.ask.city} · {stamp(summary.ask.sell_price_min_date)} UTC
                      {isStale(summary.ask.sell_price_min_date) ? " · stale" : ""}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>—</strong>
                    <small>Unavailable</small>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Highest buy order</dt>
              <dd>
                {summary.bid ? (
                  <>
                    <strong className="numeric">
                      <Silver value={summary.bid.buy_price_max} />
                    </strong>
                    <small>
                      {summary.bid.city} · {stamp(summary.bid.buy_price_max_date)} UTC
                      {isStale(summary.bid.buy_price_max_date) ? " · stale" : ""}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>—</strong>
                    <small>Unavailable</small>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <div
            className="table-scroll"
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
                {observed.map((row) => (
                  <tr key={row.city}>
                    <th scope="row">
                      <span className="city-dot" data-city={row.city} aria-hidden="true" />
                      {row.city}
                    </th>
                    <td className="numeric">
                      {row.sell_price_min > 0 ? (
                        <>
                          <Silver value={row.sell_price_min} />
                          <small>
                            {stamp(row.sell_price_min_date)}
                            {isStale(row.sell_price_min_date) ? " · stale" : ""}
                          </small>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="numeric">
                      {row.buy_price_max > 0 ? (
                        <>
                          <Silver value={row.buy_price_max} />
                          <small>
                            {stamp(row.buy_price_max_date)}
                            {isStale(row.buy_price_max_date) ? " · stale" : ""}
                          </small>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small className="muted">
            Albion Online Data Project · source times in UTC · observations older than one hour are
            marked stale. Other qualities and price history are in the Market Explorer.
          </small>
        </>
      )}
    </section>
  );
}
