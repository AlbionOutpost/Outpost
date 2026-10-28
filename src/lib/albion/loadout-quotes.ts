import type { MarketPrice, QuoteSelection } from "./market-quotes";
import { isStale } from "./freshness";
import { sumObservedCosts } from "./observed-costs";

/** One selected-quality item per slot. Missing scans are never zero-cost purchases. */
export function summarizeLoadoutQuotes(
  selected: QuoteSelection[],
  quotes: Record<string, { prices: MarketPrice[]; error?: string }>,
  city: string,
  now = Date.now(),
) {
  const rows = selected.map((item) => {
    const quote = quotes[`${item.itemId}:${item.quality}`];
    const observation = quote?.prices.find(
      (row) =>
        row.item_id === item.itemId &&
        row.quality === item.quality &&
        row.city === city &&
        city !== "Black Market" &&
        row.sell_price_min > 0,
    );
    return {
      observation,
      stale: !!observation && isStale(observation.sell_price_min_date, now),
      checked: !!quote,
      failed: !!quote?.error,
    };
  });
  const priced = rows.filter((row) => row.observation).length;
  const stale = rows.filter((row) => row.stale).length;
  const knownCost = sumObservedCosts(
    rows.flatMap((row) => (row.observation ? [row.observation.sell_price_min] : [])),
  );
  return {
    rows,
    priced,
    stale,
    recent: priced - stale,
    checked: rows.filter((row) => row.checked).length,
    failed: rows.filter((row) => row.failed).length,
    missing: selected.length - priced,
    knownCost,
    total: selected.length > 0 && priced === selected.length ? knownCost : null,
  };
}
