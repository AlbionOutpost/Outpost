import { afterEach, expect, it, vi } from "vitest";
import { prepareProductionRestore } from "../src/lib/albion/recipe-restore";
import { findRecipe } from "../src/lib/albion/recipes";
import { gameRecipe } from "../src/lib/albion/game/recipes";
import { initialProduction, productionSchema } from "../src/lib/albion/production";
afterEach(() => vi.unstubAllGlobals());

it("loads the exact unregistered game recipe before validating restored inputs", async () => {
  const input = { ...initialProduction("crafting", "europe"), recipeId: "T5_WOOD_LEVEL1@1~2" };
  expect(findRecipe(input.recipeId)).toBeUndefined();
  expect(productionSchema.safeParse(input).success).toBe(false);
  const fetcher = vi.fn(async () => Response.json({ recipe: gameRecipe(input.recipeId) }));
  vi.stubGlobal("fetch", fetcher);
  await prepareProductionRestore(input);
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(
    "/api/recipes/T5_WOOD_LEVEL1%401~2",
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(productionSchema.safeParse(input).success).toBe(true);
});

it("keeps failed restores unchanged, validates declared IDs, and rejects mismatched recipes", async () => {
  const input = { ...initialProduction("crafting", "europe"), recipeId: "T6_WOOD_LEVEL1@1~2" };
  const original = structuredClone(input);
  const fetcher = vi.fn(async () => new Response("", { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(prepareProductionRestore(input)).rejects.toThrow("Your current inputs were kept");
  expect(input).toEqual(original);
  expect(findRecipe(input.recipeId)).toBeUndefined();
  fetcher.mockResolvedValue(Response.json({ recipe: gameRecipe("T4_MAIN_AXE") }));
  await expect(prepareProductionRestore(input)).rejects.toThrow("identity did not match");
  expect(findRecipe(input.recipeId)).toBeUndefined();
  fetcher.mockClear();
  await expect(prepareProductionRestore({ ...input, recipeId: "../../arbitrary" })).rejects.toThrow(
    "unsupported",
  );
  await expect(
    prepareProductionRestore({ kind: "production-plan", runs: Array(31).fill(input) }),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});

it("loads each declared plan recipe only once before full plan validation", async () => {
  const run = { ...initialProduction("crafting", "europe"), recipeId: "T7_WOOD_LEVEL1@1~2" };
  const fetcher = vi.fn(async () => Response.json({ recipe: gameRecipe(run.recipeId) }));
  vi.stubGlobal("fetch", fetcher);
  await prepareProductionRestore({ kind: "production-plan", runs: [run, run] });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(productionSchema.safeParse(run).success).toBe(true);
});
