import { describe, it, expect } from "vitest";
import { parseMarketPreview, observationLabel } from "../src/lib/albion/market-preview";
const now = Date.parse("2026-10-26T12:00:00Z");
const row = {
  item_id: "T4_BAG",
  quality: 1,
  city: "Lymhurst",
  sell_price_min: 1200,
  buy_price_max: 900,
  sell_price_min_date: "2026-10-26T11:59:00",
  buy_price_max_date: "2026-10-26T11:50:00Z",
};
describe("homepage observation preview", () => {
  it("preserves real quote sides, zeros and source dates", () => {
    const rows = parseMarketPreview(
      {
        region: "europe",
        prices: [
          { ...row, buy_price_max: 0 },
          { ...row, city: "Bridgewatch" },
        ],
      },
      "europe",
      "T4_BAG",
    );
    expect(rows[0].city).toBe("Bridgewatch");
    expect(rows[1].buy_price_max).toBe(0);
    expect(rows[1].sell_price_min_date).toBe(row.sell_price_min_date);
  });
  it("rejects mixed identities, regions and qualities", () => {
    for (const value of [
      { ...row, item_id: "T5_BAG" },
      { ...row, quality: 2 },
    ])
      expect(() =>
        parseMarketPreview({ region: "europe", prices: [value] }, "europe", "T4_BAG"),
      ).toThrow();
    expect(() =>
      parseMarketPreview({ region: "asia", prices: [row] }, "europe", "T4_BAG"),
    ).toThrow();
  });
  it("rejects malformed, unsafe and duplicate city observations", () => {
    for (const value of [
      { ...row, city: "Injected city" },
      { ...row, sell_price_min: -1 },
      { ...row, buy_price_max: 1e30 },
    ])
      expect(() =>
        parseMarketPreview({ region: "europe", prices: [value] }, "europe", "T4_BAG"),
      ).toThrow();
    expect(() =>
      parseMarketPreview({ region: "europe", prices: [row, row] }, "europe", "T4_BAG"),
    ).toThrow();
  });
  it("does not imply freshness for missing prices or unknown sentinel timestamps", () => {
    expect(observationLabel(0, row.sell_price_min_date, now)).toEqual({
      label: "Unavailable",
      dateTime: null,
    });
    for (const date of ["", "0001-01-01T00:00:00", "invalid"])
      expect(observationLabel(1200, date, now)).toEqual({ label: "Time unknown", dateTime: null });
  });
  it("distinguishes recent, stale and future observations and normalizes UTC", () => {
    expect(observationLabel(1200, row.sell_price_min_date, now)).toEqual({
      label: "Recent",
      dateTime: "2026-10-26T11:59:00.000Z",
    });
    expect(observationLabel(1200, "2026-10-26T09:00:00Z", now).label).toBe("Stale");
    expect(observationLabel(1200, "2026-10-26T13:00:00Z", now).label).toBe("Time uncertain");
  });
});
