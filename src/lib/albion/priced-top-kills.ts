import { cities, regionSchema, type Region } from "./region-config";
import { getCombatEvents, getTopKills, type CombatEvent } from "./combat-events";
import { getPrices, type MarketPrice } from "./market-client";
import { rankByGearValue, withGearValue } from "./kill-value";

const royal = cities.filter((c) => c !== "Black Market" && c !== "Brecilien");
/** Kills priced per request: the highest-fame part of the seven-day shortlist. */
const PRICED = 15;

/** Lowest-sell observations for every victim's worn pieces, 50 items a batch. A failed batch
 * leaves those pieces unpriced; their kills say so. */
async function wornPrices(region: Region, events: Pick<CombatEvent, "victim">[]) {
  const worn = events.flatMap((e) =>
    e.victim.equipment.flatMap((p) =>
      p.itemId ? [{ itemId: p.itemId, quality: p.quality ?? 1 }] : [],
    ),
  );
  const items = [...new Set(worn.map((w) => w.itemId))];
  const qualities = [...new Set(worn.map((w) => w.quality))];
  const prices: MarketPrice[] = [];
  for (let i = 0; i < items.length; i += 50) {
    try {
      prices.push(...(await getPrices(region, items.slice(i, i + 50), qualities)));
    } catch {
      // Those pieces stay without a listing; nothing is substituted.
    }
  }
  return prices;
}

/**
 * The three highest-value kills of the last seven days on a server. Outpost's collector keeps a
 * shortlist of the week's highest-fame kills (fame follows the victim's gear); this prices each
 * shortlisted victim's worn gear — every piece at its lowest royal-city sell order for the same
 * quality — and ranks by that estimate. Pieces without a listing are counted and mark the total
 * incomplete; nothing is substituted. Throws when the kill feed itself is unavailable.
 */
export async function pricedTopKills(region: Region) {
  regionSchema.parse(region);
  const feed = await getTopKills(region);
  const candidates = feed.events.slice(0, PRICED);
  const prices = await wornPrices(region, candidates);
  const events = rankByGearValue(candidates, prices, royal).slice(0, 3);
  return { ...feed, events, window: { days: 7 } };
}

/**
 * A page of the published kill feed with each victim's worn gear priced the same way, in the
 * feed's own order, so the page needs no price requests of its own. Throws when the feed is
 * unavailable; a missing listing is counted, never filled in.
 */
export async function pricedCombatEvents(region: Region, offset: number) {
  regionSchema.parse(region);
  const feed = await getCombatEvents(region, offset);
  const prices = await wornPrices(region, feed.events);
  return { ...feed, events: withGearValue(feed.events, prices, royal) };
}
