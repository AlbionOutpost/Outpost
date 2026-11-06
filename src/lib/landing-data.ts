import type { MarketPrice } from "@/lib/albion/market-quotes";
import type { TopKill, TopKillsFeed } from "@/lib/albion/combat-events";
import type { LandingCraftQuote } from "@/lib/landing-craft-quote";
import type { Region } from "@/lib/albion/region-config";

/** Each part of the homepage answer stands alone: a failed part carries its own error. */
export type LandingPart<T> = ({ ok: true } & T) | { ok: false; error: string };

export type LandingKill = TopKill & {
  gearValue: { total: number; priced: number; missing: number } | null;
};
export type LandingKills = Omit<TopKillsFeed, "events"> & {
  events: LandingKill[];
  window: { days: number };
};

/** `GET /api/landing`: every live preview on the homepage for one server, in one answer. */
export type LandingData = {
  region: Region;
  fetchedAt: string;
  source: "Albion Online Data Project";
  /** Every royal-city (and Black Market) quote for the showcase item, quality 1. */
  market: LandingPart<{ item: string; prices: MarketPrice[] }>;
  /** Daily averages in the cheapest city with a sell order (or the fallback city). */
  history:
    | {
        ok: true;
        item: string;
        city: string;
        data: { avg_price: number; item_count: number; timestamp: string }[];
      }
    | { ok: false; city: string; error: string };
  craft: LandingPart<LandingCraftQuote>;
  /** Quotes for the example planner plan, quality 1. */
  planner: LandingPart<{ prices: MarketPrice[] }>;
  kills: LandingPart<LandingKills>;
};
