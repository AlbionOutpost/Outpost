import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { regionSchema } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { gearCategoryIds } from "@/lib/albion/craft-categories";
import { gearCandidates } from "@/lib/albion/scan-candidates";

/**
 * Black Market board data: the gear of one category over a tier range at one enchantment and
 * quality, with every city's observations from one bounded AODP batch. The page compares each
 * royal-city sell order with the Black Market's buy order and applies the player's tax.
 */
export const GET = apiHandler("economy.black-market", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      category: z.enum(gearCategoryIds),
      fromTier: z.coerce.number().int().min(2).max(8),
      toTier: z.coerce.number().int().min(2).max(8),
      enchantment: z.coerce.number().int().min(0).max(4),
      quality: z.coerce.number().int().min(1).max(5),
    })
    .refine((p) => p.fromTier <= p.toTier, "Choose a tier range from low to high")
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const { total, items } = gearCandidates(v.category, v.fromTier, v.toTier, v.enchantment);
  const rows = items.length
    ? await getPrices(
        v.region,
        items.map((i) => i.id),
        v.quality,
      )
    : [];
  return NextResponse.json({
    region: v.region,
    source: "Albion Online Data Project",
    fetchedAt: new Date().toISOString(),
    quality: v.quality,
    total,
    items,
    prices: rows.filter((r) => r.sell_price_min > 0 || r.buy_price_max > 0),
  });
});
