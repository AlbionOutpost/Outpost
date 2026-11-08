import { beforeEach, describe, expect, it } from "vitest";
import {
  WATCH_SEEN_KEY,
  readSeen,
  seenKey,
  seenSnapshot,
  sideChange,
  writeSeen,
} from "@/lib/watch-seen";
import type { MarketPrice } from "@/lib/albion/market-quotes";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage;
});
const quote = (city: string, sell: number, buy: number): MarketPrice => ({
  item_id: "T4_BAG",
  city,
  quality: 1,
  sell_price_min: sell,
  sell_price_min_date: "2026-11-08T10:00:00",
  buy_price_max: buy,
  buy_price_max_date: "2026-11-08T10:05:00",
});

describe("watchlist since your last visit", () => {
  it("compares each side with what was marked as seen, in percent of the old price", () => {
    const was = seenSnapshot(
      [quote("Lymhurst", 1000, 800), quote("Black Market", 0, 900)],
      "2026-11-07T10:00:00Z",
    );
    // The Black Market buy order is the highest bid; its sell listing is never the lowest ask.
    expect(was.sell).toEqual({ value: 1000, city: "Lymhurst", observedAt: "2026-11-08T10:00:00" });
    expect(was.buy?.city).toBe("Black Market");
    const now = seenSnapshot([quote("Martlock", 1125, 0)], "2026-11-08T10:00:00Z");
    // 1,000 → 1,125 is +12.5 %; the new lowest sell order is in another city and says so.
    expect(sideChange(was, now, "sell")).toMatchObject({
      kind: "up",
      percent: 12.5,
      was: { city: "Lymhurst" },
      now: { city: "Martlock" },
    });
    // No buy order now: no data, never a fall to zero.
    expect(sideChange(was, now, "buy")).toEqual({ kind: "no-data", was: was.buy });
    expect(sideChange(undefined, now, "sell")).toEqual({ kind: "first" });
    expect(sideChange(now, was, "buy")).toMatchObject({ kind: "new", now: { value: 900 } });
    // 1,000 → 960 is −4 %; 1,000 → 1,000.4 is under 0.05 % and reads unchanged.
    expect(sideChange(was, seenSnapshot([quote("Lymhurst", 960, 0)], "x"), "sell")).toMatchObject({
      kind: "down",
      percent: -4,
    });
    expect(sideChange(was, seenSnapshot([quote("Lymhurst", 1000.4, 0)], "x"), "sell").kind).toBe(
      "same",
    );
  });
  it("keeps snapshots on this device and drops tampered entries", () => {
    const key = seenKey({ region: "europe", itemId: "T4_BAG", quality: 1 });
    expect(key).toBe("europe:T4_BAG:1");
    const entry = seenSnapshot([quote("Lymhurst", 1000, 800)], "2026-11-08T10:00:00Z");
    expect(writeSeen({ [key]: entry })).toBe(true);
    expect(readSeen()).toEqual({ [key]: entry });
    store.set(
      WATCH_SEEN_KEY,
      JSON.stringify({ [key]: entry, "europe:<b>:1": entry, "asia:T4_BAG:1": { sell: -1 } }),
    );
    expect(Object.keys(readSeen())).toEqual([key]);
    store.set(WATCH_SEEN_KEY, "not json");
    expect(readSeen()).toEqual({});
  });
});
