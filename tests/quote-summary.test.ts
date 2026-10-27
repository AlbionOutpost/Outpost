import { expect, it } from "vitest";
import { summarizeQuotes } from "../src/lib/albion/quote-summary";
const row = {
  item_id: "T4_BAG",
  quality: 1,
  city: "Lymhurst",
  sell_price_min: 100,
  buy_price_max: 90,
  sell_price_min_date: "2026-10-26T00:00:00Z",
  buy_price_max_date: "2026-10-26T00:00:00Z",
};
const now = Date.parse("2026-10-26T00:30:00Z");
it("ignores missing-side sentinels when summarizing freshness and quotes", () => {
  const result = summarizeQuotes(
    [{ ...row, buy_price_max: 0, buy_price_max_date: "0001-01-01" }],
    now,
  );
  expect(result.available).toBe(1);
  expect(result.stale).toBe(0);
  expect(result.bid).toBeNull();
  expect(result.ask?.sell_price_min).toBe(100);
});
it("reports the actual cheapest ask and strongest bid without inferring executable profit", () => {
  const other = { ...row, city: "Caerleon", sell_price_min: 120, buy_price_max: 110 };
  const result = summarizeQuotes([row, other], now);
  expect(result.ask?.city).toBe("Lymhurst");
  expect(result.bid?.city).toBe("Caerleon");
  expect(result.available).toBe(4);
});
it("keeps empty quotes empty and warns on positive undated observations", () => {
  expect(summarizeQuotes([], now)).toEqual({ ask: null, bid: null, available: 0, stale: 0 });
  expect(summarizeQuotes([{ ...row, sell_price_min_date: "" }], now).stale).toBe(1);
});
