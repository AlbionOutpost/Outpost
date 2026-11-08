import { describe, expect, it } from "vitest";
import { rankCrafts, type CraftSettings } from "@/lib/albion/craft-ranking";
import { craftLinkHref, parseCraftLink } from "@/lib/albion/craft-link";
import type { Recipe } from "@/lib/albion/recipes";
import type { MarketPrice } from "@/lib/albion/market-quotes";

const now = Date.parse("2026-11-08T12:00:00Z");
const at = "2026-11-08T11:45:00",
  older = "2026-11-08T11:10:00";
const recipe = (id: string, output: string, ingredients: [string, number, boolean?][]): Recipe => ({
  id,
  name: `${id} fixture`,
  kind: "crafting",
  output,
  outputCount: 1,
  craftingCategory: "sword",
  tier: 6,
  enchantment: 0,
  source: "test fixture",
  ingredients: ingredients.map(([i, quantity, returnable]) => ({
    id: i,
    name: i,
    quantity,
    quality: "normal",
    ...(returnable === false ? { returnable: false } : {}),
  })),
});
const sword = recipe("T6_FIXTURE_SWORD", "T6_FIXTURE_SWORD", [
  ["T6_METALBAR", 16],
  ["T6_LEATHER", 8],
]);
const dagger = recipe("T6_FIXTURE_DAGGER", "T6_FIXTURE_DAGGER", [["T6_METALBAR", 10]]);
const relic = recipe("T6_FIXTURE_RELIC", "T6_FIXTURE_RELIC", [
  ["T6_METALBAR", 10],
  ["T6_FIXTURE_ARTEFACT", 1, false],
]);
const price = (
  item_id: string,
  city: string,
  sell: number,
  buy = 0,
  quality = 1,
  date = at,
): MarketPrice => ({
  item_id,
  city,
  quality,
  sell_price_min: sell,
  sell_price_min_date: date,
  buy_price_max: buy,
  buy_price_max_date: date,
});
const rows = [
  price("T6_METALBAR", "Lymhurst", 100, 0, 1, older),
  price("T6_LEATHER", "Lymhurst", 50),
  price("T6_FIXTURE_SWORD", "Martlock", 3000, 0, 2),
  price("T6_FIXTURE_DAGGER", "Martlock", 2500, 0, 2),
  // The relic's artifact has no sell order in Lymhurst: the relic can't be priced.
  price("T6_FIXTURE_RELIC", "Martlock", 9000, 0, 2),
  price("T6_FIXTURE_ARTEFACT", "Martlock", 10, 0, 1),
  // Black Market bids for the sword at quality 2 (instant sale, no setup fee).
  price("T6_FIXTURE_SWORD", "Black Market", 0, 3200, 2),
];
const settings: CraftSettings = {
  region: "europe",
  buyCity: "Lymhurst",
  craftCity: "Lymhurst",
  sellCity: "Martlock",
  quality: 2,
  dailyBonus: 0,
  tax: 4,
  setupFee: 2.5,
};
const recipes = [sword, dagger, relic];

describe("craft ranking", () => {
  it("prices each craft with the production engine and ranks by silver per craft", () => {
    const { ranked, unpriced, overBudget } = rankCrafts(recipes, rows, settings, null, now);
    // Lymhurst is the sword specialty city: 18 + 15 = 33 efficiency → 33/133 of materials back.
    // Sword: materials 16×100 + 8×50 = 2,000; credit 2,000×33/133 = 496.2406;
    // fees 3,000 × 6.5% = 195; profit 3,000 − 195 − (2,000 − 496.2406) = 1,301.2406.
    // Dagger: 10×100 = 1,000; credit 248.1203; fees 162.5; profit 2,500 − 162.5 − 751.8797
    // = 1,585.6203, so the dagger ranks first per craft.
    expect(ranked.map((r) => r.recipe.id)).toEqual(["T6_FIXTURE_DAGGER", "T6_FIXTURE_SWORD"]);
    const [d, s] = ranked;
    expect(s.returnRate).toBeCloseTo(3300 / 133, 10);
    expect(s.upfront).toBe(2000);
    expect(s.fees).toBeCloseTo(195, 10);
    expect(s.profit).toBeCloseTo(805 + 66000 / 133, 6);
    expect(s.margin).toBeCloseTo(((805 + 66000 / 133) / 3000) * 100, 6);
    expect(d.profit).toBeCloseTo(1585.6203, 4);
    expect([d.crafts, s.crafts]).toEqual([1, 1]);
    // The oldest observation is the bars (11:10), still under an hour: not stale.
    expect(s).toMatchObject({ oldestAt: older, stale: false });
    expect(overBudget).toEqual([]);
    expect(unpriced.map((r) => [r.recipe.id, r.missing])).toEqual([
      ["T6_FIXTURE_RELIC", ["T6_FIXTURE_ARTEFACT"]],
    ]);
    expect(unpriced[0].profit).toBeNull();
  });
  it("ranks by what the budget pays for in whole crafts", () => {
    // 5,000 silver: 2 swords (2,000 each) → 2,602.48; 5 daggers (1,000 each) → 7,928.10.
    const five = rankCrafts(recipes, rows, settings, 5000, now);
    expect(five.ranked.map((r) => [r.recipe.id, r.crafts])).toEqual([
      ["T6_FIXTURE_DAGGER", 5],
      ["T6_FIXTURE_SWORD", 2],
    ]);
    expect(five.ranked[1].total).toBeCloseTo(2 * (805 + 66000 / 133), 6);
    // 1,500 silver buys one dagger and no sword: the sword is over budget, not ranked at 0.
    const small = rankCrafts(recipes, rows, settings, 1500, now);
    expect(small.ranked.map((r) => r.recipe.id)).toEqual(["T6_FIXTURE_DAGGER"]);
    expect(small.overBudget.map((r) => r.recipe.id)).toEqual(["T6_FIXTURE_SWORD"]);
    expect(() => rankCrafts(recipes, rows, settings, 0, now)).toThrow();
  });
  it("sells to the Black Market buy order without the setup fee, and uses the base rate elsewhere", () => {
    const bm = rankCrafts([sword], rows, { ...settings, sellCity: "Black Market" }, null, now);
    // 3,200 − 3,200 × 4% − (2,000 − 496.2406) = 1,569.2406
    expect(bm.ranked[0].profit).toBeCloseTo(3200 - 128 - 2000 + 66000 / 133, 6);
    expect(bm.ranked[0].run.prices.T6_FIXTURE_SWORD).toMatchObject({
      execution: "instant-sale",
      city: "Black Market",
      value: 3200,
    });
    // Martlock is not the sword city: 18/118 back. 3,000 − 195 − 2,000 × 100/118 = 1,110.0847
    const plain = rankCrafts([sword], rows, { ...settings, craftCity: "Martlock" }, null, now);
    expect(plain.ranked[0].returnRate).toBeCloseTo(1800 / 118, 10);
    expect(plain.ranked[0].profit).toBeCloseTo(2805 - 200000 / 118, 6);
    // A day-old bar observation makes the row stale without hiding it.
    const stale = rankCrafts(
      [sword],
      rows.map((r) =>
        r.item_id === "T6_METALBAR" ? { ...r, sell_price_min_date: "2026-11-07T08:00:00" } : r,
      ),
      settings,
      null,
      now,
    );
    expect(stale.ranked[0].stale).toBe(true);
  });
  it("opens the same run in the calculator and refuses malformed links whole", () => {
    const [row] = rankCrafts([sword], rows, settings, null, now).ranked;
    const href = craftLinkHref(row);
    expect(href.startsWith("/tools/crafting?")).toBe(true);
    const params = Object.fromEntries(new URL(href, "https://x.test").searchParams);
    expect(params).toMatchObject({
      region: "europe",
      recipe: "T6_FIXTURE_SWORD",
      buy: "Lymhurst",
      sell: "Martlock",
      quality: "2",
      tax: "4",
      setup: "2.5",
      craft: "Lymhurst",
      daily: "0",
      returns: "T6_METALBAR,T6_LEATHER",
    });
    const settingsBack = parseCraftLink(params)!;
    expect(settingsBack).toMatchObject({
      materialCity: "Lymhurst",
      outputCity: "Martlock",
      quality: 2,
      tax: 4,
      setupFee: 2.5,
      returns: { T6_METALBAR: true, T6_LEATHER: true },
      mechanicsProfile: { city: "Lymhurst", dailyBonus: 0 },
    });
    expect(settingsBack.returnRate).toBeCloseTo(3300 / 133, 10);
    expect(parseCraftLink({ ...params, buy: "Black Market" })).toBeUndefined();
    expect(parseCraftLink({ ...params, tax: "120" })).toBeUndefined();
    expect(parseCraftLink({ recipe: "T6_FIXTURE_SWORD" })).toBeUndefined();
    expect(craftLinkHref({ ...row, recipe: { ...row.recipe, category: "cooking" } })).toMatch(
      /^\/tools\/cooking\?/,
    );
  });
});
