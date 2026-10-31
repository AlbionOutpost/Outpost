import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getTopKills } from "@/lib/albion/combat-events";
import { getPrices } from "@/lib/albion/market-client";

const royal = cities.filter((c) => c !== "Black Market" && c !== "Brecilien");

/**
 * The three highest-fame kills in the source's ranking, each with both loadouts, what the
 * victim carried, who took part and an estimated value of the victim's gear: every worn piece
 * at its lowest royal-city sell order for the same quality, summed. Pieces without a listing
 * are counted and leave the total marked incomplete; nothing is substituted.
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
    const worn = feed.events.flatMap((e) =>
      e.victim.equipment.flatMap((p) =>
        p.itemId ? [{ itemId: p.itemId, quality: p.quality ?? 1 }] : [],
      ),
    );
    const items = [...new Set(worn.map((w) => w.itemId))].slice(0, 50);
    const qualities = [...new Set(worn.map((w) => w.quality))];
    let prices: Awaited<ReturnType<typeof getPrices>> = [];
    try {
      prices = items.length ? await getPrices(region, items, qualities) : [];
    } catch {
      prices = [];
    }
    const events = feed.events.map((e) => {
      let total = 0;
      let missing = 0;
      let priced = 0;
      for (const piece of e.victim.equipment) {
        if (!piece.itemId) continue;
        const quality = piece.quality ?? 1;
        const best = prices
          .filter(
            (p) =>
              p.item_id === piece.itemId &&
              p.quality === quality &&
              royal.includes(p.city as (typeof royal)[number]) &&
              p.sell_price_min > 0,
          )
          .reduce((m, p) => Math.min(m, p.sell_price_min), Infinity);
        if (Number.isFinite(best)) {
          total += best;
          priced++;
        } else missing++;
      }
      return {
        ...e,
        gearValue: priced ? { total, priced, missing } : null,
      };
    });
    return NextResponse.json(
      { ...feed, events },
      { headers: { "Cache-Control": "public, max-age=120" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Albion’s kill ranking is unavailable right now." },
      { status: 503 },
    );
  }
}
