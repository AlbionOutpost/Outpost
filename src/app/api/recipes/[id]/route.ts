import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { gameRecipe, gameRecipesForOutput } from "@/lib/albion/game/server-recipes";
const recipeId = z.string().regex(/^[A-Z0-9_]{3,80}(@[1-4])?(~\d)?$/);
export const GET = apiHandler(
  "recipes.get",
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = recipeId.parse(decodeURIComponent((await params).id));
    const recipe = gameRecipe(id);
    if (!recipe) throw new HttpError(404, "Unknown recipe");
    return NextResponse.json({ recipe, alternatives: gameRecipesForOutput(recipe.output) });
  },
);
