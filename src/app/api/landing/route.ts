import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cities, regionSchema, type Region } from "@/lib/albion/region-config";
import { getPrices, type MarketPrice } from "@/lib/albion/market-client";
import { getHistory } from "@/lib/albion/history-client";
import { pricedTopKills } from "@/lib/albion/priced-top-kills";
import { landingCraftItems, landingCraftQuote } from "@/lib/landing-craft";
import { LANDING_HISTORY_FALLBACK_CITY, landingShowcase } from "@/lib/landing-showcase";
import type { LandingData } from "@/lib/landing-data";

const errors = {
  market: "Market data is unavailable. No prices have been substituted.",
  history: "Historical observations are unavailable. No data has been substituted.",
  craft: "Market observations unavailable.",
  planner: "Market observations unavailable. No prices substituted.",
  kills: "Albion’s kill feed is unavailable right now.",
} as const;

/** The city the market card charts: its cheapest sell order outside the Black Market. */
function cheapestCity(rows: MarketPrice[]) {
  return (
    rows
      .filter((p) => p.city !== "Black Market" && p.sell_price_min > 0)
      .toSorted((a, b) => a.sell_price_min - b.sell_price_min)[0]?.city ??
    LANDING_HISTORY_FALLBACK_CITY
  );
}

async function history(region: Region, city: string): Promise<LandingData["history"]> {
  const item = landingShowcase.market.id;
  const known = cities.find((c) => c === city);
  if (!known) return { ok: false, city, error: errors.history };
  try {
    const rows = await getHistory(region, item, known, landingShowcase.market.quality);
    return { ok: true, item, city: known, data: rows[0]?.data ?? [] };
  } catch {
    return { ok: false, city: known, error: errors.history };
  }
}

/**
 * Every live preview on the homepage for one server in one answer: the market card's quotes and
 * the cheapest city's daily history, the crafting showcase, the planner's example plan and the
 * week's top kills. The market, crafting and planner items share one quality-1 price batch (one
 * upstream request instead of three); history follows it because it needs the cheapest city;
 * the kill feed runs alongside. Each part fails on its own with its own error and nothing is
 * substituted. A response with a failed part is marked so the edge never keeps it.
 */
export async function GET(req: NextRequest) {
  const parsed = z
    .object({ region: regionSchema })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Choose a valid server." }, { status: 400 });
  const region = parsed.data.region;
  const planIds = landingShowcase.plan.map((p) => p.itemId as string);
  const marketId = landingShowcase.market.id;
  const ids = [...new Set([marketId, ...planIds, ...landingCraftItems()])];
  const prices = getPrices(region, ids, 1).then(
    (rows) => ({ ok: true as const, rows }),
    () => ({ ok: false as const }),
  );
  const marketPart = prices.then((p): LandingData["market"] =>
    p.ok
      ? { ok: true, item: marketId, prices: p.rows.filter((r) => r.item_id === marketId) }
      : { ok: false, error: errors.market },
  );
  const [market, historyPart, craft, planner, kills] = await Promise.all([
    marketPart,
    marketPart.then((m) =>
      history(region, m.ok ? cheapestCity(m.prices) : LANDING_HISTORY_FALLBACK_CITY),
    ),
    prices.then((p): LandingData["craft"] => {
      if (!p.ok) return { ok: false, error: errors.craft };
      try {
        return { ok: true, ...landingCraftQuote(region, 1, p.rows) };
      } catch {
        return { ok: false, error: errors.craft };
      }
    }),
    prices.then((p): LandingData["planner"] =>
      p.ok
        ? { ok: true, prices: p.rows.filter((r) => planIds.includes(r.item_id)) }
        : { ok: false, error: errors.planner },
    ),
    pricedTopKills(region).then(
      (feed): LandingData["kills"] => ({ ok: true, ...feed }),
      (): LandingData["kills"] => ({ ok: false, error: errors.kills }),
    ),
  ]);
  const body: LandingData = {
    region,
    fetchedAt: new Date().toISOString(),
    source: "Albion Online Data Project",
    market,
    history: historyPart,
    craft,
    planner,
    kills,
  };
  const partial = [market, historyPart, craft, planner, kills].some((part) => !part.ok);
  return NextResponse.json(body, {
    headers: partial ? { "X-Outpost-Partial": "1" } : undefined,
  });
}
