import { expect, it } from "vitest";
import { scenarioHashLimit, scenarioLink } from "@/lib/scenario-link";
import { initialProduction } from "@/lib/albion/production";
import { productionPlanSchema } from "@/lib/albion/production-plan";
import { recipeFor } from "@/lib/albion/recipes";

it("creates a regional static link that round-trips its complete inputs", () => {
  const input = {
    region: "europe" as const,
    title: "Farm & craft · weekly",
    prices: [0, null, 120],
  };
  const result = new URL(
    scenarioLink("https://albionoutpost.com/tools/crafting?region=asia#old", input, "scenario")!,
  );
  expect(result.origin + result.pathname).toBe("https://albionoutpost.com/tools/crafting");
  expect(result.searchParams.get("region")).toBe("europe");
  expect(JSON.parse(decodeURIComponent(result.hash.slice("#scenario=".length)))).toEqual(input);
});

it("does not issue a link for a valid plan larger than the restore limit", () => {
  const run = initialProduction("crafting", "europe");
  run.recipeId = "grind-t8_potion_lifeward-e3";
  const recipe = recipeFor(run);
  for (const id of [...recipe.ingredients.map((i) => i.id), recipe.output])
    run.prices[id] = {
      value: 100,
      manual: false,
      observedAt: "2026-10-28T10:00:00+00:00",
      region: "europe",
      city: "Lymhurst",
      quality: 1,
    };
  const input = productionPlanSchema.parse({
    kind: "production-plan",
    region: "europe",
    runs: Array(30).fill(run),
  });
  expect(JSON.stringify(input).length).toBeLessThan(65536);
  expect(("#production-plan=" + encodeURIComponent(JSON.stringify(input))).length).toBeGreaterThan(
    scenarioHashLimit,
  );
  expect(
    scenarioLink("https://albionoutpost.com/tools/crafting", input, "production-plan"),
  ).toBeNull();
  // Creating a rejected share link must not trim the saved/exportable plan.
  expect(input.runs).toHaveLength(30);
  expect(input.runs[0].prices[recipe.output].observedAt).toBe("2026-10-28T10:00:00+00:00");
});
