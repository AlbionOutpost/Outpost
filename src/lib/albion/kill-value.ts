import type { MarketPrice } from "./market-client";
import { sourceTimestamp } from "./freshness";

/** A listing older than the kill window says nothing about this week's gear value. */
export const GEAR_PRICE_MAX_AGE = 7 * 24 * 3600_000;

export type GearValue = { total: number; priced: number; missing: number } | null;

/**
 * Estimates each victim's worn gear (lowest sell order in the given cities, same item and
 * quality, observed within the last seven days) and orders the kills by that estimate, highest
 * first. Older or undated listings count as missing. Kills with no priced piece
 * keep their fame order at the end; a missing listing is counted, never filled in.
 */
/** Only the fields the ranking reads, so callers need not match the full TopKill shape. */
type Rankable = {
  fame: number;
  victim: { equipment: { itemId: string | null; quality?: number | null }[] };
};

export function rankByGearValue<K extends Rankable>(
  kills: K[],
  prices: MarketPrice[],
  cities: readonly string[],
  now = Date.now(),
): (K & { gearValue: GearValue })[] {
  const lowest = new Map<string, number>();
  const fresh = (date: string | undefined) => {
    const stamp = date ? sourceTimestamp(date) : NaN;
    return Number.isFinite(stamp) && now - stamp <= GEAR_PRICE_MAX_AGE && stamp - now <= 300_000;
  };
  for (const p of prices)
    if (p.sell_price_min > 0 && cities.includes(p.city) && fresh(p.sell_price_min_date)) {
      const key = `${p.item_id}:${p.quality}`;
      lowest.set(key, Math.min(lowest.get(key) ?? Infinity, p.sell_price_min));
    }
  return kills
    .map((kill) => {
      let total = 0,
        priced = 0,
        missing = 0;
      for (const piece of kill.victim.equipment) {
        if (!piece.itemId) continue;
        const best = lowest.get(`${piece.itemId}:${piece.quality ?? 1}`);
        if (best === undefined) missing++;
        else {
          total += best;
          priced++;
        }
      }
      return { ...kill, gearValue: priced ? { total, priced, missing } : null };
    })
    .sort((a, b) => (b.gearValue?.total ?? -1) - (a.gearValue?.total ?? -1) || b.fame - a.fame);
}
