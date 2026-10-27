import { expect, it } from "vitest";
import { initialProduction } from "../src/lib/albion/production";
import {
  mergeProductionObservations,
  productionPriceQuery,
} from "../src/lib/albion/production-observations";

const manual = {
  value: 100,
  manual: true,
  observedAt: null,
  region: null,
  city: null,
  quality: 1,
} as const;
const source = {
  ...manual,
  value: 200,
  manual: false,
  region: "europe",
  city: "Lymhurst",
  observedAt: "2026-10-26T00:00:00Z",
} as const;

it("ignores a response for a different region, city, quality, recipe or enchantment", () => {
  const requested = initialProduction("crafting", "europe");
  for (const changes of [
    { region: "asia" as const },
    { materialCity: "Caerleon" as const },
    { outputCity: "Bridgewatch" as const },
    { quality: 3 },
    { recipeId: "broadsword-t4" },
    { enchantFamily: "BAG" },
    { tier: 8 },
    { fromEnchant: 1 },
    { toEnchant: 3 },
  ]) {
    const current = { ...requested, ...changes };
    expect(mergeProductionObservations(current, requested, { T4_METALBAR: source }, true)).toBe(
      current,
    );
  }
  expect(productionPriceQuery({ ...requested, batches: 100 })).toBe(
    productionPriceQuery(requested),
  );
});

it("preserves a manual edit made during an overwrite refresh", () => {
  const requested = initialProduction("crafting", "europe");
  requested.prices.T4_METALBAR = manual;
  const current = {
    ...requested,
    prices: { ...requested.prices, T4_METALBAR: { ...manual, value: 175 } },
  };
  const merged = mergeProductionObservations(
    current,
    requested,
    { T4_METALBAR: source, T4_PLANKS: source },
    true,
  );
  expect(merged.prices.T4_METALBAR.value).toBe(175);
  expect(merged.prices.T4_PLANKS.value).toBe(200);
});

it("refreshes unchanged manual prices only with the explicit overwrite setting", () => {
  const requested = initialProduction("crafting", "europe");
  requested.prices.T4_METALBAR = manual;
  expect(
    mergeProductionObservations(requested, requested, { T4_METALBAR: source }, false).prices
      .T4_METALBAR.value,
  ).toBe(100);
  expect(
    mergeProductionObservations(requested, requested, { T4_METALBAR: source }, true).prices
      .T4_METALBAR.value,
  ).toBe(200);
});
