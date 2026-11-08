import { trade } from "./calculations";
import { isStale } from "./freshness";
import type { MarketPrice } from "./market-quotes";

export type BoardItem = { id: string; name: string; tier: number };
export type BoardQuote = { city: string; value: number; observedAt: string; stale: boolean };
export type BoardRow = BoardItem & {
  /** The cheapest sell order in a player market (never the Black Market itself). */
  buy: BoardQuote | null;
  /** The Black Market's highest buy order: the instant sale. */
  blackMarket: BoardQuote | null;
  complete: boolean;
  stale: boolean;
  /** Black Market buy order after tax, minus the purchase; null when either price is missing. */
  net: number | null;
  /** Net as a share of the sale, as trade() reports it. */
  margin: number | null;
  /** Cities with a sell order for this exact item and quality. */
  cities: number;
};

/**
 * One row per item: buy at the lowest sell order in any player city, sell instantly to the Black
 * Market's highest buy order, pay `tax` on the sale. Only observations of the same item and
 * quality count; an observed 0 is missing. Complete rows come first by net, then the rest in
 * their original order. Expected values are worked by hand in tests/black-market.test.ts.
 */
export function blackMarketBoard(
  items: BoardItem[],
  rows: MarketPrice[],
  quality: number,
  tax: number,
  now = Date.now(),
): BoardRow[] {
  const board = items.map((item): BoardRow => {
    const own = rows.filter((r) => r.item_id === item.id && r.quality === quality);
    let buy: BoardQuote | null = null;
    let cities = 0;
    for (const r of own) {
      if (r.city === "Black Market" || r.sell_price_min <= 0) continue;
      cities++;
      if (!buy || r.sell_price_min < buy.value)
        buy = {
          city: r.city,
          value: r.sell_price_min,
          observedAt: r.sell_price_min_date,
          stale: isStale(r.sell_price_min_date, now),
        };
    }
    const bm = own.find((r) => r.city === "Black Market" && r.buy_price_max > 0);
    const blackMarket = bm
      ? {
          city: "Black Market",
          value: bm.buy_price_max,
          observedAt: bm.buy_price_max_date,
          stale: isStale(bm.buy_price_max_date, now),
        }
      : null;
    const result =
      buy && blackMarket
        ? trade({ buy: buy.value, sell: blackMarket.value, quantity: 1, tax, fee: 0, transport: 0 })
        : null;
    return {
      ...item,
      buy,
      blackMarket,
      complete: !!result,
      stale: !!buy?.stale || !!blackMarket?.stale,
      net: result?.profit ?? null,
      margin: result?.margin ?? null,
      cities,
    };
  });
  const complete = board.filter((r) => r.complete).sort((a, b) => b.net! - a.net!);
  return [...complete, ...board.filter((r) => !r.complete)];
}
