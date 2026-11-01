import { expect, it } from "vitest";
import { catalogSearchResponse, mergeCatalogOptions } from "../src/lib/catalog/search";
const bow = { id: "T4_2H_BOW", name: "Bow", slot: "Main hand", tier: 4, enchantment: 0 };

it("keeps factual local entries when they are absent from the imported catalog", () => {
  expect(mergeCatalogOptions([], [bow])).toEqual([bow]);
  expect(mergeCatalogOptions([{ ...bow, name: "Reviewed Bow" }], [bow])).toEqual([
    { ...bow, name: "Reviewed Bow" },
  ]);
});
it("validates bounded catalog responses rather than casting arbitrary JSON", () => {
  expect(catalogSearchResponse.safeParse({ items: [bow] }).success).toBe(true);
  for (const item of [
    { ...bow, tier: 9 },
    { ...bow, id: "../../secret" },
    { ...bow, name: "" },
  ])
    expect(catalogSearchResponse.safeParse({ items: [item] }).success).toBe(false);
  expect(catalogSearchResponse.safeParse({ items: Array(31).fill(bow) }).success).toBe(false);
});
