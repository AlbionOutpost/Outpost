import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { findRecipe } from "@/lib/albion/recipes";
import "@/lib/albion/game/server-recipes";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import {
  initialProduction,
  production,
  returnRateFromBonus,
  type ProductionInput,
} from "@/lib/albion/production";
import bundled from "@/lib/albion/expanded-recipes.json" with { type: "json" };

/** Every bundled T4–T6 crafting recipe (27, 39 distinct items: one price request). */
const candidates = (bundled as { id: string; kind: string }[])
  .filter((r) => r.kind === "crafting" && /-t[4-6]$/.test(r.id))
  .map((r) => r.id);
/** A royal city's base production bonus (18%) without focus: about 15.3% of materials back. */
const RETURN_RATE = Math.round(returnRateFromBonus(18) * 1000) / 10;
type City = (typeof cities)[number];
const royal = cities.filter((c): c is City => c !== "Black Market" && c !== "Brecilien");

/**
 * The most worthwhile craft right now among the bundled T4–T6 recipes: every candidate priced in every
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
      // The city's base resource return without focus, premium sales tax and the sell-order
      // setup fee; no focus, city specialty bonus or station fee.
      returns: Object.fromEntries(recipe.ingredients.map((i) => [i.id, true])),
      returnRate: RETURN_RATE,
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
  // Cities where the same recipe cannot be priced completely: named, never estimated
  const unpriced = all
    .filter((s) => s.recipe.id === best.recipe.id && s.missing.length)
    .map((s) => s.city);
  return NextResponse.json(
    {
      region: v.region,
      source: "Albion Online Data Project",
      batches: v.batches,
      candidates: recipes.length,
      assumptions: { tax: 4, setupFee: 2.5, returnRate: RETURN_RATE, useFocus: false },
      best,
      byCity,
      unpriced,
    },
    { headers: { "Cache-Control": "public, max-age=120" } },
  );
});
