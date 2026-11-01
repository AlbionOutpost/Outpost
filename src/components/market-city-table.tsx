import { Silver } from "./silver";
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
 * Every city's best sell and buy order for one item and quality. Each price carries its own
 * age (exact UTC time on hover and for assistive tech) and a Stale chip past one hour; a side
 * nobody observed is an em dash, never a zero.
 */
export function MarketCityTable({
  rows,
  ask,
  bid,
  selectedCity,
  onSelect,
  now,
}: {
  rows: MarketPrice[];
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
              <abbr title="Sell order minus buy order in the same city, as a share of the buy order">
                Spread
              </abbr>
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
                    onClick={() => onSelect(selected ? "" : r.city)}
                  >
                    <span className="city-dot" data-city={r.city} aria-hidden="true" />
                    {r.city}
                    <span className="sr-only"> market details</span>
                  </button>
                </th>
                <td className="numeric">
                  {blackMarket ? (
                    <>
                      <span className="market-price-missing">—</span>
                      <small className="market-inline-time">Buys from players only</small>
                    </>
                  ) : (
                    <Price
                      value={r.sell_price_min}
                      date={r.sell_price_min_date}
                      best={ask === r ? "Lowest" : null}
                      missing="No sell order"
                      now={now}
                    />
                  )}
                </td>
                <td className="numeric">
                  <Price
                    value={r.buy_price_max}
                    date={r.buy_price_max_date}
                    best={bid === r ? "Highest" : null}
                    missing="No buy order"
                    now={now}
                  />
                </td>
                <td className="numeric mx-spread-col">
                  {spread == null ? (
                    <span className="market-price-missing">—</span>
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
  now,
}: {
  value: number;
  date: string;
  best: string | null;
  missing: string;
  now: number;
}) {
  if (!value)
    return (
      <>
        <span className="market-price-missing">—</span>
        <small className="market-inline-time">{missing}</small>
      </>
    );
  const age = sourceAge(date, now);
  return (
    <>
      <Silver value={value} />
      <small className="market-inline-time">
        {best && <span className="mx-best">{best}</span>}
        <time dateTime={date} title={`${observedAt(date)} UTC`}>
          {age.label}
          <span className="sr-only"> ({observedAt(date)} UTC)</span>
        </time>
        {age.stale && <span className="mx-stale">Stale</span>}
      </small>
    </>
  );
}
