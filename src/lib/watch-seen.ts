import { z } from "zod";
import { summarizeQuotes } from "./albion/quote-summary";
import type { MarketPrice } from "./albion/market-quotes";

/**
 * "Since your last visit" for the market watchlist: the lowest sell order and highest buy order a
 * player last marked as seen, per region · item · quality, kept on this device only. Each side
 * keeps its own city and observation time; nothing here is sent to the server.
 */
export const WATCH_SEEN_KEY = "outpost:watch-seen-v1";
const side = z
  .object({
    value: z.number().positive().max(1e12),
    city: z.string().min(1).max(40),
    observedAt: z.string().max(64),
  })
  .nullable();
const entry = z.object({ seenAt: z.string().max(64), sell: side, buy: side });
export type SeenEntry = z.infer<typeof entry>;
export type SeenMap = Record<string, SeenEntry>;
const MAX_ENTRIES = 200;

export const seenKey = (i: { region: string; itemId: string; quality: number }) =>
  `${i.region}:${i.itemId}:${i.quality}`;

/** Unreadable or tampered storage reads as "nothing seen yet", entry by entry. */
export function readSeen(): SeenMap {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCH_SEEN_KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: SeenMap = {};
    for (const [key, value] of Object.entries(raw).slice(0, MAX_ENTRIES)) {
      const parsed = entry.safeParse(value);
      if (/^[a-z]+:[A-Z0-9_@]{3,100}:[1-5]$/.test(key) && parsed.success) out[key] = parsed.data;
    }
    return out;
  } catch {
    return {};
  }
}
export function writeSeen(map: SeenMap) {
  try {
    // Newest marks win when the device holds more than the cap.
    const kept = Object.entries(map)
      .sort((a, b) => Date.parse(b[1].seenAt) - Date.parse(a[1].seenAt))
      .slice(0, MAX_ENTRIES);
    localStorage.setItem(WATCH_SEEN_KEY, JSON.stringify(Object.fromEntries(kept)));
    return true;
  } catch {
    return false;
  }
}

/** The quotes to remember: the same summary the watchlist row shows. */
export function seenSnapshot(prices: MarketPrice[], seenAt: string): SeenEntry {
  const { ask, bid } = summarizeQuotes(prices);
  return {
    seenAt,
    sell: ask
      ? { value: ask.sell_price_min, city: ask.city, observedAt: ask.sell_price_min_date }
      : null,
    buy: bid
      ? { value: bid.buy_price_max, city: bid.city, observedAt: bid.buy_price_max_date }
      : null,
  };
}

export type SideChange =
  | { kind: "first" }
  | { kind: "no-data"; was: NonNullable<SeenEntry["sell"]> | null }
  | { kind: "new"; now: NonNullable<SeenEntry["sell"]> }
  | {
      kind: "up" | "down" | "same";
      percent: number;
      was: NonNullable<SeenEntry["sell"]>;
      now: NonNullable<SeenEntry["sell"]>;
    };

/**
 * One side's change since it was marked as seen. "first": never marked on this device. "no-data":
 * nothing observed now (it is not a fall to zero). "new": nothing was observed then. Otherwise the
 * change in percent of the old price; under 0.05 % either way reads as unchanged.
 */
export function sideChange(
  was: SeenEntry | undefined,
  now: SeenEntry,
  which: "sell" | "buy",
): SideChange {
  if (!was) return { kind: "first" };
  const before = was[which],
    after = now[which];
  if (!after) return { kind: "no-data", was: before };
  if (!before) return { kind: "new", now: after };
  const percent = ((after.value - before.value) / before.value) * 100;
  return {
    kind: Math.abs(percent) < 0.05 ? "same" : percent > 0 ? "up" : "down",
    percent,
    was: before,
    now: after,
  };
}
