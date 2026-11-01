import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { safeGuideHref } from "../src/components/guide-article-content";
import { recipes } from "../src/lib/albion/recipes";
import {
  initialProduction,
  production,
  productionOutputQuality,
} from "../src/lib/albion/production";
import { archivedSpellOptions } from "../src/lib/albion/equipment-abilities";
import type { LibraryBuild, LibraryComposition } from "../src/lib/grind-library-types";
const read = (name: string) => readFileSync(`public/library/grind-${name}.json`, "utf8");
describe("owner public library", () => {
  it("preserves all listed records, omits account identity and matches pinned import hashes", () => {
    const manifest = JSON.parse(read("manifest"));
    const builds: LibraryBuild[] = JSON.parse(read("builds"));
    const comps: LibraryComposition[] = JSON.parse(read("compositions"));
    expect(builds).toHaveLength(10770);
    expect(comps).toHaveLength(682);
    expect(new Set(builds.map((b) => b.id)).size).toBe(10770);
    expect(new Set(builds.map((b) => b.slug)).size).toBe(10770);
    expect(read("builds")).not.toMatch(/"(?:user_id|sessionToken|email|upvote_count)"\s*:/);
    for (const [file, hash] of Object.entries(manifest.outputSha256)) {
      expect(
        createHash("sha256")
          .update(readFileSync(`public/library/${file}`))
          .digest("hex"),
      ).toBe(hash);
    }
    // The captured Crystal Arena roster deliberately repeats its third/fourth position.
    expect(comps.find((c) => c.slug === "crystal-arena")?.members).toEqual([
      "40f7a6a2-7962-4a35-9cb7-4f7eaf39a761",
      "1f30e642-f3b4-4001-b375-990d011c0232",
      "40f7a6a2-7962-4a35-9cb7-4f7eaf39a761",
      "40f7a6a2-7962-4a35-9cb7-4f7eaf39a761",
    ]);
  });
  it("uses explicit inherited armor actives and spell aliases, retaining Bloodmoon's replacement E", () => {
    expect(archivedSpellOptions("T8_HEAD_LEATHER_SET3")).toContainEqual({
      key: "Active",
      id: "SUMMONER_CD_REDUCTION",
      name: "Meditation",
    });
    expect(
      archivedSpellOptions("T8_SHOES_PLATE_SET1").find((s) => s.id === "WANDERLUST")?.key,
    ).toBe("Active");
    const spells = archivedSpellOptions("T8_2H_SHAPESHIFTER_MORGANA");
    expect(spells.some((s) => s.id === "SHAPESHIFT_PANTHER")).toBe(false);
    expect(spells.find((s) => s.key === "E")?.id).toBe("SHAPESHIFT_WEREWOLF");
  });
  it("rejects executable guide URLs and credentials without passing attributes through", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "//evil.example",
      "https://user:pass@example.com/",
    ])
      expect(safeGuideHref(href)).toBeUndefined();
    expect(safeGuideHref("https://albiononlinegrind.com/guides/market-flipping-guide")).toBe(
      "/guides/market-flipping-guide",
    );
    expect(safeGuideHref("https://www.albion-online-data.com/")).toBe(
      "https://www.albion-online-data.com/",
    );
  });
});
describe("restored production quantities and original accounting", () => {
  it("keeps a ten-meal Mutton Stew batch and an independently evaluated complete cost", () => {
    const r = recipes.find((r) => r.id === "grind-t6_meal_stew")!;
    expect(r.outputCount).toBe(10);
    expect(r.ingredients.map((i) => [i.id, i.quantity])).toEqual([
      ["T6_POTATO", 12],
      ["T4_BREAD", 12],
      ["T6_MEAT", 24],
    ]);
    const v = initialProduction("crafting", "europe");
    Object.assign(v, { recipeId: r.id, quality: 5, batches: 2, stationFee: 50, tax: 10 });
    for (const [id, value] of Object.entries({
      T6_POTATO: 100,
      T4_BREAD: 200,
      T6_MEAT: 300,
      T6_MEAL_STEW: 2000,
    }))
      v.prices[id] = {
        value,
        manual: true,
        observedAt: null,
        region: null,
        city: null,
        quality: 1,
      };
    // Ingredients per batch =1200+2400+7200=10800; two batches+station=21700.
    // Twenty meals sell for40000;4000 tax leaves14300 net cash/economic profit.
    expect(productionOutputQuality(v)).toBe(1);
    expect(production(v)).toMatchObject({
      outputQuantity: 20,
      upfront: 21700,
      fees: 4000,
      cashProfit: 14300,
      profit: 14300,
    });
    delete v.prices.T6_MEAT;
    expect(production(v).profit).toBeNull();
  });
  it("uses five potions per captured Major Healing batch, with no inferred returns", () => {
    const r = recipes.find((r) => r.id === "grind-t6_potion_heal")!;
    expect(r.outputCount).toBe(5);
    expect(r.ingredients.map((i) => [i.id, i.quantity])).toEqual([
      ["T6_FOXGLOVE", 72],
      ["T5_EGG", 18],
      ["T6_ALCOHOL", 18],
    ]);
    expect(recipes.filter((r) => r.historical)).toHaveLength(399);
  });
});
