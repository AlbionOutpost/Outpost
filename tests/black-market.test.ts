import { describe, expect, it } from "vitest";
import { blackMarketBoard } from "@/lib/albion/black-market";
import type { MarketPrice } from "@/lib/albion/market-quotes";

const now = Date.parse("2026-11-08T12:00:00Z");
const fresh = "2026-11-08T11:30:00",
  old = "2026-11-07T09:00:00";
const row = (
  item_id: string,
  city: string,
  sell: number,
  buy: number,
  quality = 2,
  sellDate = fresh,
  buyDate = fresh,
): MarketPrice => ({
  item_id,
  city,
  quality,
  sell_price_min: sell,
  sell_price_min_date: sellDate,
  buy_price_max: buy,
  buy_price_max_date: buyDate,
});
const items = [
  { id: "T6_MAIN_SWORD", name: "Broadsword · T6.0", tier: 6 },
  { id: "T6_2H_CLAYMORE", name: "Claymore · T6.0", tier: 6 },
  { id: "T6_2H_DUALSWORD", name: "Dual Swords · T6.0", tier: 6 },
];
const rows = [
  // Broadsword: Martlock 1,000 is the cheapest sell order; Lymhurst 1,200; BM buys at 1,500.
  row("T6_MAIN_SWORD", "Lymhurst", 1200, 900),
  row("T6_MAIN_SWORD", "Martlock", 1000, 800),
  // A Black Market sell listing is not a purchase source, and another quality never counts.
  row("T6_MAIN_SWORD", "Black Market", 400, 1500),
  row("T6_MAIN_SWORD", "Thetford", 10, 0, 3),
  // Claymore: 1,000 in Thetford, the BM only offers 900 (a loss), its sell order went stale.
  row("T6_2H_CLAYMORE", "Thetford", 1000, 0, 2, old),
  row("T6_2H_CLAYMORE", "Bridgewatch", 0, 500),
  row("T6_2H_CLAYMORE", "Black Market", 0, 900),
  // Dual swords: city orders only, no Black Market buy order.
  row("T6_2H_DUALSWORD", "Lymhurst", 2000, 0),
];

describe("Black Market board", () => {
  it("nets the Black Market buy order after tax against the cheapest city sell order", () => {
    const [sword, claymore, dual] = blackMarketBoard(items, rows, 2, 4, now);
    // 1,500 × (1 − 0.04) − 1,000 = 440; margin 440 / 1,500 = 29.33…%
    expect(sword).toMatchObject({
      id: "T6_MAIN_SWORD",
      complete: true,
      stale: false,
      net: 440,
      cities: 2,
      buy: { city: "Martlock", value: 1000, observedAt: fresh },
      blackMarket: { city: "Black Market", value: 1500, observedAt: fresh },
    });
    expect(sword.margin).toBeCloseTo(29.3333333, 6);
    // 900 × 0.96 − 1,000 = −136, a loss kept as a loss; stale because the sell order is old.
    expect(claymore).toMatchObject({ net: -136, complete: true, stale: true, cities: 1 });
    expect(claymore.margin).toBeCloseTo(-15.1111111, 6);
    // No Black Market order: unavailable, never 0, and listed after the priced rows.
    expect(dual).toMatchObject({
      complete: false,
      net: null,
      margin: null,
      blackMarket: null,
      buy: { city: "Lymhurst", value: 2000 },
    });
  });
  it("applies the no-premium tax and leaves items without any order unavailable", () => {
    const board = blackMarketBoard(items, rows, 2, 8, now);
    // 1,500 × 0.92 − 1,000 = 380; 900 × 0.92 − 1,000 = −172
    expect(board.map((r) => r.net)).toEqual([380, -172, null]);
    const none = blackMarketBoard(items, [], 2, 4, now);
    expect(none.every((r) => !r.complete && r.buy === null && r.blackMarket === null)).toBe(true);
    expect(none.map((r) => r.id)).toEqual(items.map((i) => i.id));
  });
  it("orders a better Black Market item first", () => {
    const board = blackMarketBoard(
      items,
      [...rows, row("T6_2H_DUALSWORD", "Black Market", 0, 3000)],
      2,
      4,
      now,
    );
    // 3,000 × 0.96 − 2,000 = 880 beats 440.
    expect(board.map((r) => [r.id, r.net])).toEqual([
      ["T6_2H_DUALSWORD", 880],
      ["T6_MAIN_SWORD", 440],
      ["T6_2H_CLAYMORE", -136],
    ]);
  });
});
