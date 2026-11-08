import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { regionSchema } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { craftCategoryIds } from "@/lib/albion/craft-categories";
import { craftCandidates, craftPriceRows } from "@/lib/albion/scan-candidates";

/**
 * Craft finder data: the candidate recipes of one category, tier and enchantment and their AODP
 * observations from one bounded batch. The page runs `production()` on them for the player's own
 * cities, returns, tax and budget, so changing those never requests prices again.
 */
export const GET = apiHandler("economy.crafts", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      category: z.enum(craftCategoryIds),
      tier: z.coerce.number().int().min(1).max(8),
      enchantment: z.coerce.number().int().min(0).max(4),
      quality: z.coerce.number().int().min(1).max(5),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const consumable = v.category === "food" || v.category === "potion";
  const quality = consumable ? 1 : v.quality;
  const { total, recipes, items } = craftCandidates(v.category, v.tier, v.enchantment);
  const rows = items.length
    ? await getPrices(v.region, items, quality === 1 ? 1 : [1, quality])
    : [];
  return NextResponse.json({
    region: v.region,
    source: "Albion Online Data Project",
    fetchedAt: new Date().toISOString(),
    quality,
    candidates: total,
    recipes,
    prices: craftPriceRows(recipes, quality, rows),
  });
});
