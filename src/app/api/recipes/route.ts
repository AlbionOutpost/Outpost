import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { searchGameRecipes } from "@/lib/albion/game/server-recipes";
// Static game data only: no market calls and no user data.
export const GET = apiHandler("recipes.search", async (req: NextRequest) => {
  const v = z
    .object({
      kind: z.enum(["crafting", "refining"]),
      category: z.enum(["cooking", "alchemy", "equipment"]).optional(),
      q: z.string().trim().max(80).optional(),
      tier: z.coerce.number().int().min(1).max(8).optional(),
      enchantment: z.coerce.number().int().min(0).max(4).optional(),
      limit: z.coerce.number().int().min(1).max(60).default(40),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json(searchGameRecipes(v));
});
