import type { MarketPrice } from "./market-client";
import { isStale } from "./freshness";

export function summarizeQuotes(rows: MarketPrice[], now = Date.now()) {
  let ask: MarketPrice | null = null,
    bid: MarketPrice | null = null;
  let available = 0,
    stale = 0;
  for (const row of rows) {
    if (row.sell_price_min > 0) {
      available++;
      if (isStale(row.sell_price_min_date, now)) stale++;
      // Black Market sell listings target its NPC buyer; players cannot buy them.
      if (row.city !== "Black Market" && (!ask || row.sell_price_min < ask.sell_price_min))
        ask = row;
    }
    if (row.buy_price_max > 0) {
      available++;
      if (isStale(row.buy_price_max_date, now)) stale++;
      if (!bid || row.buy_price_max > bid.buy_price_max) bid = row;
    }
  }
  return { ask, bid, available, stale };
}
