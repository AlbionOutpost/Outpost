import { Silver } from "./silver";
import "./market-table.css";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceAge } from "@/lib/albion/source-age";
import { sourceTimestamp } from "@/lib/albion/freshness";

/** "2026-10-25 14:03" for a source timestamp (UTC), or "Unknown". */
export function observedAt(value: string) {
  const stamp = sourceTimestamp(value);
  return Number.isFinite(stamp)
    ? new Date(stamp).toISOString().slice(0, 16).replace("T", " ")
    : "Unknown";
}

/**
 * Every city's best sell and buy order for one item and quality, one line per city. Each price
 * carries its own age (exact UTC time on hover and for assistive tech) and, past one hour, a
 * stale mark that says "Stale" to assistive tech and on hover; a side nobody observed is an em
 * dash with its reason, never a zero.
 */
export function MarketCityTable({
  rows,
  ask,
  bid,
  selectedCity,
  onSelect,
  missingLabel,
  loading = false,
  now,
}: {
  rows: MarketPrice[];
  /** Placeholder rows while observations load: every figure is a shimmering stand-in. */
  loading?: boolean;
  /** Placeholder rows (nothing loaded): every price says this instead of "No sell order". */
  missingLabel?: string;
  ask: MarketPrice | null;
  bid: MarketPrice | null;
  selectedCity: string;
  onSelect: (city: string) => void;
  now: number;
}) {
  return (
    <div
      className="table-scroll mx-table-well"
      tabIndex={0}
      role="region"
      aria-label="Scrollable market observations"
    >
      <table className="mx-table">
        <caption className="sr-only">
          Lowest sell order and highest buy order per city, with each observation&apos;s age
        </caption>
        <thead>
          <tr>
            <th scope="col">City</th>
            <th scope="col" className="numeric">
              Sell order
            </th>
            <th scope="col" className="numeric">
              Buy order
            </th>
            <th scope="col" className="numeric mx-spread-col">
              Spread
            </th>
          </tr>
        </thead>
        <tbody className="price-refresh">
          {rows.map((r) => {
            const blackMarket = r.city === "Black Market";
            const spread =
              r.sell_price_min && r.buy_price_max && !blackMarket
                ? (r.sell_price_min - r.buy_price_max) / r.buy_price_max
                : null;
            const selected = r.city === selectedCity;
            return (
              <tr key={r.city} className={selected ? "selected-market-row" : undefined}>
                <th scope="row">
                  <button
                    type="button"
                    className="market-row-select"
                    aria-pressed={selected}
                    disabled={!!missingLabel}
                    onClick={() => onSelect(selected ? "" : r.city)}
                  >
                    <span className="city-dot" data-city={r.city} aria-hidden="true" />
                    {r.city}
                    <span className="sr-only"> market details</span>
                  </button>
                </th>
                <td className="numeric" data-label="Sell order">
                  {blackMarket ? (
                    <Missing label="Buys from players only" />
                  ) : (
                    <Price
                      loading={loading}
                      value={r.sell_price_min}
                      date={r.sell_price_min_date}
                      best={ask === r ? "Lowest" : null}
                      missing={missingLabel ?? "No sell order"}
                      now={now}
                    />
                  )}
                </td>
                <td className="numeric" data-label="Buy order">
                  <Price
                    loading={loading}
                    value={r.buy_price_max}
                    date={r.buy_price_max_date}
                    best={bid === r ? "Highest" : null}
                    missing={missingLabel ?? "No buy order"}
                    now={now}
                  />
                </td>
                <td className="numeric mx-spread-col">
                  {loading ? (
                    <Skeleton>+0.0%</Skeleton>
                  ) : spread == null ? (
                    <span className="market-price-missing">
                      —<span className="sr-only"> Unavailable</span>
                    </span>
                  ) : (
                    <span className={spread >= 0 ? "is-gain" : "is-loss"}>
                      {spread >= 0 ? "+" : "−"}
                      {Math.abs(spread * 100).toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Price({
  value,
  date,
  best,
  missing,
  loading,
  now,
}: {
  value: number;
  date: string;
  best: string | null;
  missing: string;
  loading: boolean;
  now: number;
}) {
  // The stand-in has the figure's own line boxes, so the row keeps its height when it lands.
  if (loading)
    return (
      <span className="mx-price">
        <Skeleton>0,000</Skeleton>
        <small className="market-inline-time">
          <Skeleton>1 min ago</Skeleton>
        </small>
      </span>
    );
  if (!value) return <Missing label={missing} />;
  const age = sourceAge(date, now);
  // The figure comes first for assistive tech; the row lays it out at the right edge.
  return (
    <span className="mx-price">
      <Silver value={value} />
      <small className={`market-inline-time${age.stale ? " is-stale" : ""}`}>
        {best && <span className="mx-best">{best}</span>}
        <time dateTime={date} title={`${observedAt(date)} UTC`}>
          {age.label}
          <span className="sr-only"> ({observedAt(date)} UTC)</span>
        </time>
        {age.stale && (
          <span className="mx-stale-mark" title="Stale: seen more than an hour ago">
            <span className="sr-only">Stale</span>
          </span>
        )}
      </small>
    </span>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <span className="mx-price is-missing">
      <span className="market-price-missing">—</span>
      <small className="market-inline-time">{label}</small>
    </span>
  );
}

/** A shimmering stand-in shaped by its (invisible) sample text; static under reduced motion.
 * Hidden from assistive tech, which hears the surrounding status instead. */
export function Skeleton({ children }: { children: string }) {
  return (
    <span className="mx-skel" aria-hidden="true">
      {children}
    </span>
  );
}
