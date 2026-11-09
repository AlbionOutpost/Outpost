import { Silver } from "./silver";
import "./market-table.css";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceAge } from "@/lib/albion/source-age";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";

/** "2026-10-25 14:03" for a source timestamp (UTC), or "Unknown". */
export function observedAt(value: string) {
  const stamp = sourceTimestamp(value);
  return Number.isFinite(stamp)
    ? new Date(stamp).toISOString().slice(0, 16).replace("T", " ")
    : "Unknown";
}

/**
 * How loudly a price shows its age. Seen within the hour ("fresh") it shows none; older
 * ("stale") a short muted-amber age such as "6 h"; past a day ("old") the figure dims beside
 * "2 d". Every tone keeps the exact UTC time on hover and, spoken in full, for assistive tech.
 */
export function priceAge(date: string, now: number) {
  const age = sourceAge(date, now);
  const exact = `${observedAt(date)} UTC`;
  if (!age.known)
    return { tone: "old", short: age.label, exact, spoken: `Stale, ${age.label}` } as const;
  const minutes = Math.max(0, Math.round((now - sourceTimestamp(date)) / 60000));
  const short =
    minutes < 1
      ? "<1 min"
      : minutes < 60
        ? `${minutes} min`
        : minutes < 24 * 60
          ? `${Math.round(minutes / 60)} h`
          : `${Math.round(minutes / 1440)} d`;
  const tone = !isStale(date, now) ? "fresh" : minutes > 24 * 60 ? "old" : "stale";
  // Assistive tech hears the age in full, and "Stale" past the hour, as the eye sees amber.
  const spoken = `${tone === "fresh" ? "" : "Stale, "}seen ${age.label}, ${exact}`;
  return { tone, short, exact, spoken } as const;
}

/**
 * Every city's best sell and buy order for one item and quality, one line per city. A price
 * seen within the hour stands alone; an older one carries its short age (see `priceAge`), and
 * every one keeps its exact time on hover and for assistive tech. The lowest sell and highest
 * buy are marked by a small accent dot; a side nobody observed is an em dash with its reason,
 * never a zero.
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
          Lowest sell order and highest buy order per city, with the time each was seen
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
          <Skeleton>0 h</Skeleton>
        </small>
      </span>
    );
  if (!value) return <Missing label={missing} />;
  const age = priceAge(date, now);
  // The figure comes first for assistive tech; the row lays it out at the right edge.
  return (
    <span
      className={`mx-price is-${age.tone}${best ? " is-best" : ""}`}
      title={`${best ? `${best} · ` : ""}Seen ${age.exact}`}
    >
      <span className="mx-figure">
        {best && <span className="mx-best" aria-hidden="true" />}
        <Silver value={value} />
        {best && <span className="sr-only"> {best}</span>}
      </span>
      <small className="market-inline-time">
        <time dateTime={date}>
          {age.tone !== "fresh" && <span aria-hidden="true">{age.short}</span>}
          <span className="sr-only">{age.spoken}</span>
        </time>
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
