import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { recipeFor } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { productionOutputQuality, productionSellsInstantly } from "@/lib/albion/production";
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
  const requests = [
    ...recipe.ingredients.map((i) => ({
      id: i.id,
      quality: i.quality === "selected" ? v.quality : 1,
      city: v.materialCity,
      execution: "instant-purchase" as const,
    })),
    {
      id: recipe.output,
      quality: productionOutputQuality(v),
      city: v.outputCity,
      // The Black Market only buys instantly, at its highest buy order; elsewhere the output is listed.
      execution: productionSellsInstantly(v) ? ("instant-sale" as const) : ("listing" as const),
    },
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
        const bid = r.execution === "instant-sale";
        const value = (bid ? row?.buy_price_max : row?.sell_price_min) || null;
        return [
          r.id,
          {
            value,
            manual: false,
            observedAt: value ? (bid ? row!.buy_price_max_date : row!.sell_price_min_date) : null,
            execution: r.execution,
            region: v.region,
            city: r.city,
            quality: r.quality,
          },
        ];
      }),
    ),
  });
});
