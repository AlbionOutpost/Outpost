import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { findRecipe } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { initialProduction, production, type ProductionInput } from "@/lib/albion/production";

/** Recipes the landing page may demonstrate; the full calculator takes any recipe. */
const previewRecipes = new Map<string, "crafting" | "refining">([
  ["battleaxe-t4", "crafting"],
  ["battleaxe-t5", "crafting"],
  ["battleaxe-t6", "crafting"],
  ["broadsword-t6", "crafting"],
  ["bow-t6", "crafting"],
  ["bag-t6", "crafting"],
  ["cape-t6", "crafting"],
  ["metalbar-t6", "refining"],
  ["planks-t6", "refining"],
  ["leather-t6", "refining"],
  ["cloth-t6", "refining"],
  ["metalbar-t5", "refining"],
  ["planks-t5", "refining"],
]);

/**
 * One crafting scenario, priced from current observations and run through the same
 * `production()` service as the calculator, so the landing page shows a real result or a real
 * missing-price state instead of an illustration. Assumptions are returned so the page can
 * label them; nothing is estimated when a price is missing.
 */
export const GET = apiHandler("economy.preview", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      recipeId: z.string().max(60),
      city: z.enum(cities).default("Bridgewatch"),
      batches: z.coerce.number().int().min(1).max(50).default(1),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const kind = previewRecipes.get(v.recipeId);
  if (!kind || v.city === "Black Market") throw new HttpError(400, "Unsupported preview scenario");
  const recipe = findRecipe(v.recipeId);
  if (!recipe || recipe.kind !== kind) throw new HttpError(400, "Unsupported recipe");
  const ids = [...recipe.ingredients.map((i) => i.id), recipe.output];
  const rows = await getPrices(v.region, [...new Set(ids)], 1);
  const prices: ProductionInput["prices"] = Object.fromEntries(
    ids.map((id) => {
      const row = rows.find((p) => p.item_id === id && p.quality === 1 && p.city === v.city);
      return [
        id,
        {
          value: row?.sell_price_min || null,
          manual: false,
          observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
          region: v.region,
          city: v.city,
          quality: 1,
        },
      ];
    }),
  );
  const assumptions = {
    ...initialProduction(kind, v.region),
    recipeId: recipe.id,
    batches: v.batches,
    materialCity: v.city,
    outputCity: v.city,
    prices,
    // Premium sales tax and the sell-order setup fee; no return rate, focus or station fee.
    tax: 4,
    setupFee: 2.5,
  };
  const result = production(assumptions);
  return NextResponse.json({
    region: v.region,
    source: "Albion Online Data Project",
    recipe: { id: recipe.id, name: recipe.name, output: recipe.output, kind },
    assumptions: {
      city: v.city,
      batches: assumptions.batches,
      returnRate: assumptions.returnRate,
      useFocus: assumptions.useFocus,
      stationFee: assumptions.stationFee,
      tax: assumptions.tax,
      setupFee: assumptions.setupFee,
    },
    rows: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
      gross: r.gross,
      observedAt: prices[r.id]?.observedAt ?? null,
    })),
    output: {
      quantity: result.outputQuantity,
      unit: prices[recipe.output]?.value ?? null,
      observedAt: prices[recipe.output]?.observedAt ?? null,
    },
    complete: result.complete,
    missing: result.missing,
    stale: result.stale,
    upfront: result.upfront,
    revenue: result.revenue,
    fees: result.fees,
    profit: result.profit,
    profitPerItem: result.profitPerItem,
    margin: result.margin,
  });
});
