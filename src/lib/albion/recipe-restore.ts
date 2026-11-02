import { z } from "zod";
import { findRecipe, registerRecipes, type Recipe } from "./recipes";

const recipeHint = z.object({
  kind: z.enum(["crafting", "refining", "enchanting"]),
  recipeId: z.string().min(1).max(60),
});
const restoreHints = z.union([
  recipeHint,
  z.object({ kind: z.literal("production-plan"), runs: z.array(recipeHint).min(1).max(30) }),
]);

/** Load only the exact bounded recipe IDs declared by a restore, before full schema validation.
 * The caller retains its existing draft until every prerequisite and full configuration validates.
 * Server-side production validation remains authoritative when saving.
 */
export async function prepareProductionRestore(configuration: unknown, signal?: AbortSignal) {
  const hints = restoreHints.parse(configuration);
  const runs = hints.kind === "production-plan" ? hints.runs : [hints];
  const missing = [
    ...new Set(
      runs
        .filter((run) => run.kind !== "enchanting" && !findRecipe(run.recipeId))
        .map((run) => run.recipeId),
    ),
  ];
  for (const id of missing)
    if (!/^[A-Z0-9_]{3,60}(?:@[1-4])?(?:~\d)?$/.test(id))
      throw new Error("Saved recipe ID is unsupported. Your current inputs were kept.");
  const group = new AbortController();
  const active = signal ? AbortSignal.any([signal, group.signal]) : group.signal;
  async function worker() {
    for (let id = missing.shift(); id; id = missing.shift()) {
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        signal: AbortSignal.any([active, AbortSignal.timeout(15000)]),
      });
      if (!response.ok)
        throw new Error(
          "Saved recipe could not be loaded. Your current inputs were kept. Try restoring again.",
        );
      const body = (await response.json()) as { recipe?: Recipe };
      if (body.recipe?.id !== id || !["crafting", "refining"].includes(body.recipe.kind))
        throw new Error("Saved recipe identity did not match. Your current inputs were kept.");
      registerRecipes([body.recipe]);
    }
  }
  // Bound concurrent reads for a plan of up to 30 recipes.
  try {
    await Promise.all([worker(), worker(), worker()]);
  } catch (error) {
    group.abort();
    throw error;
  }
}
