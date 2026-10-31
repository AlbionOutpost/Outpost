import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { findRecipe } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { initialProduction, production, type ProductionInput } from "@/lib/albion/production";

/** Recipes the landing card may showcase; the calculator takes any recipe. */
const candidates = ["cape-t6", "bag-t6", "broadsword-t6", "bow-t6", "battleaxe-t6"] as const;
type City = (typeof cities)[number];
const royal = cities.filter((c): c is City => c !== "Black Market" && c !== "Brecilien");

/**
 * The most worthwhile craft right now among a few recipes: every candidate priced in every
 * royal city from one batch of observations, run through the same `production()` as the
 * calculator, ranked by margin. Only cities where every price is known count as results;
 * if none qualify the best-covered scenario is returned with its missing prices listed.
 */
export const GET = apiHandler("landing.craft", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      batches: z.coerce.number().int().min(1).max(50).default(1),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const recipes = candidates.flatMap((id) => {
    const r = findRecipe(id);
    return r ? [r] : [];
  });
  const ids = [...new Set(recipes.flatMap((r) => [...r.ingredients.map((i) => i.id), r.output]))];
  const rows = await getPrices(v.region, ids, 1);
  const scenario = (recipe: (typeof recipes)[number], city: City) => {
    const prices: ProductionInput["prices"] = Object.fromEntries(
      [...recipe.ingredients.map((i) => i.id), recipe.output].map((id) => {
        const row = rows.find((p) => p.item_id === id && p.quality === 1 && p.city === city);
        return [
          id,
          {
            value: row?.sell_price_min || null,
            manual: false,
            observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
            region: v.region,
            city,
            quality: 1,
          },
        ];
      }),
    );
    const result = production({
      ...initialProduction(recipe.kind, v.region),
      recipeId: recipe.id,
      batches: v.batches,
      materialCity: city,
      outputCity: city,
      prices,
      // Premium sales tax and the sell-order setup fee; no return rate, focus or station fee.
      tax: 4,
      setupFee: 2.5,
    });
    return {
      recipe: { id: recipe.id, name: recipe.name, output: recipe.output, kind: recipe.kind },
      city,
      rows: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        gross: r.gross,
      })),
      outputQuantity: result.outputQuantity,
      complete: result.complete,
      missing: result.missing,
      stale: result.stale,
      upfront: result.upfront,
      fees: result.fees,
      revenue: result.revenue,
      profit: result.profit,
      margin: result.margin,
    };
  };
  const all = recipes.flatMap((r) => royal.map((city) => scenario(r, city)));
  const complete = all.filter((s) => s.complete && s.margin != null);
  const best =
    complete.toSorted((a, b) => b.margin! - a.margin!)[0] ??
    all.toSorted((a, b) => a.missing.length - b.missing.length)[0];
  const byCity = complete
    .filter((s) => s.recipe.id === best.recipe.id)
    .toSorted((a, b) => b.profit! - a.profit!)
    .map((s) => ({ city: s.city, profit: s.profit!, margin: s.margin! }));
  return NextResponse.json(
    {
      region: v.region,
      source: "Albion Online Data Project",
      batches: v.batches,
      candidates: recipes.length,
      assumptions: { tax: 4, setupFee: 2.5, returnRate: 0, useFocus: false },
      best,
      byCity,
    },
    { headers: { "Cache-Control": "public, max-age=120" } },
  );
});
