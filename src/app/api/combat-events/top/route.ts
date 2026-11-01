import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getTopKills } from "@/lib/albion/combat-events";
import { getPrices, type MarketPrice } from "@/lib/albion/market-client";
import { rankByGearValue } from "@/lib/albion/kill-value";

const royal = cities.filter((c) => c !== "Black Market" && c !== "Brecilien");
/** Kills priced per request: the highest-fame part of the seven-day shortlist. */
const PRICED = 15;

/**
 * The three highest-value kills of the last seven days on a server. Outpost's collector keeps a
 * shortlist of the week's highest-fame kills (fame follows the victim's gear); this prices each
 * shortlisted victim's worn gear — every piece at its lowest royal-city sell order for the same
 * quality — and ranks by that estimate. Pieces without a listing are counted and mark the total
 * incomplete; nothing is substituted.
 */
export async function GET(req: NextRequest) {
  const parsed = z
    .object({ region: regionSchema })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Choose a valid server." }, { status: 400 });
  const region = parsed.data.region;
  try {
    const feed = await getTopKills(region);
    const candidates = feed.events.slice(0, PRICED);
    const worn = candidates.flatMap((e) =>
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
        // A failed batch leaves those pieces unpriced; their kills say so.
      }
    }
    const events = rankByGearValue(candidates, prices, royal).slice(0, 3);
    return NextResponse.json(
      { ...feed, events, window: { days: 7 } },
      { headers: { "Cache-Control": "public, max-age=120" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Albion’s kill feed is unavailable right now." },
      { status: 503 },
    );
  }
}
