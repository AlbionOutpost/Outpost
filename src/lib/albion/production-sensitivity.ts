import { production, type ProductionInput } from "./production";
import { recipeFor } from "./recipes";

export function productionSensitivity(configuration: ProductionInput) {
  let base: ReturnType<typeof production>;
  try {
    base = production(configuration);
  } catch {
    return [];
  }
  if (!base.complete) return [];
  const recipe = recipeFor(configuration);
  const observation = configuration.prices[recipe.output];
  if (!observation || observation.value === null) return [];
  return [80, 90, 100, 110, 120].map((percent) => {
    const price = (observation.value! * percent) / 100;
    let result: ReturnType<typeof production> | null = null;
    try {
      result = production({
        ...configuration,
        prices: {
          ...configuration.prices,
          [recipe.output]: {
            ...observation,
            value: price,
            manual: true,
            observedAt: null,
            region: null,
            city: null,
          },
        },
      });
    } catch {
      /* A hypothetical scenario can exceed the engine's validated limits. */
    }
    return {
      percent,
      price,
      profit: result?.profit ?? null,
      cashProfit: result?.cashProfit ?? null,
    };
  });
}
