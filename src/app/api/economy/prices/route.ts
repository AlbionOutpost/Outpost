import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { recipeFor } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import {
  observedProductionPrices,
  productionPriceRequests,
} from "@/lib/albion/production-observations";
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
  const requests = productionPriceRequests(recipe, v);
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
    prices: observedProductionPrices(requests, rows, v.region),
  });
});
