import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { recipeFor } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { rateLimit } from "@/lib/redis";
import { productionOutputQuality } from "@/lib/albion/production";
export const GET = apiHandler("economy.prices", async (req: NextRequest) => {
  const v = z
    .object({
      kind: z.enum(["crafting", "refining", "enchanting"]),
      region: regionSchema,
      recipeId: z.string().max(60),
      materialCity: z.enum(cities),
      outputCity: z.enum(cities),
      quality: z.coerce.number().int().min(1).max(5),
      enchantFamily: z.string().max(60),
      tier: z.coerce.number().int().min(1).max(8),
      fromEnchant: z.coerce.number().int().min(0).max(2),
      toEnchant: z.coerce.number().int().min(1).max(3),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  let recipe;
  try {
    recipe = recipeFor(v);
  } catch {
    throw new HttpError(400, "Unsupported recipe");
  }
  if (!(await rateLimit("economy-prices", 60, 60)))
    throw new HttpError(429, "Price request budget exhausted");
  const requests = [
    ...recipe.ingredients.map((i) => ({
      id: i.id,
      quality: i.quality === "selected" ? v.quality : 1,
      city: v.materialCity,
    })),
    { id: recipe.output, quality: productionOutputQuality(v), city: v.outputCity },
  ];
  const rows = (
    await Promise.all(
      [...new Set(requests.map((r) => r.quality))].map((q) =>
        getPrices(
          v.region,
          [...new Set(requests.filter((r) => r.quality === q).map((r) => r.id))],
          q,
        ),
      ),
    )
  ).flat();
  return NextResponse.json({
    region: v.region,
    source: "Albion Online Data Project",
    prices: Object.fromEntries(
      requests.map((r) => {
        const row = rows.find(
          (p) => p.item_id === r.id && p.quality === r.quality && p.city === r.city,
        );
        return [
          r.id,
          {
            value: row?.sell_price_min || null,
            manual: false,
            observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
            region: v.region,
            city: r.city,
            quality: r.quality,
          },
        ];
      }),
    ),
  });
});
