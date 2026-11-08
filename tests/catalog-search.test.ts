import { expect, it } from "vitest";
import {
  catalogBaseKey,
  catalogSearchResponse,
  catalogVariantIds,
  groupCatalogOptions,
  mergeCatalogOptions,
} from "../src/lib/catalog/search";
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

const row = (id: string, name = id) => {
  const [, tier, enchantment] = /^T(\d)_[^@]+(?:@(\d))?$/.exec(id)!;
  return { id, name, slot: "Main hand", tier: Number(tier), enchantment: Number(enchantment ?? 0) };
};
it("names the base item without its tier and enchantment", () => {
  expect(catalogBaseKey("T6_MAIN_SWORD@1")).toBe("MAIN_SWORD");
  expect(catalogBaseKey("T4_2H_CLAYMORE_AVALON")).toBe("2H_CLAYMORE_AVALON");
  expect(catalogVariantIds("T6_MAIN_SWORD@1")).toHaveLength(40);
  expect(catalogVariantIds("T6_MAIN_SWORD@1")).toContain("T8_MAIN_SWORD@4");
  expect(catalogVariantIds("not an id")).toEqual([]);
});
it("lists each base item once with the versions that matched", () => {
  const rows = [
    row("T4_2H_CLAYMORE", "Adept's Claymore"),
    row("T4_2H_CLAYMORE_AVALON", "Adept's Kingmaker"),
    row("T4_2H_CLAYMORE@1", "Adept's Claymore · .1"),
    row("T5_2H_CLAYMORE", "Expert's Claymore"),
    row("T8_2H_CLAYMORE@4", "Elder's Claymore · .4"),
  ];
  const groups = groupCatalogOptions(rows, "claymore");
  expect(groups.map((g) => g.id)).toEqual(["T4_2H_CLAYMORE", "T4_2H_CLAYMORE_AVALON"]);
  expect(groups[0]).toMatchObject({
    name: "Adept's Claymore",
    tiers: [4, 8],
    enchantments: [0, 4],
  });
  expect(groups[1]).toMatchObject({ tiers: [4, 4], enchantments: [0, 0] });
});
it("keeps an exact identifier, enchanted or not, as the row and lists it first", () => {
  const rows = [row("T4_2H_CLAYMORE_AVALON"), row("T6_2H_CLAYMORE"), row("T6_2H_CLAYMORE@1")];
  expect(groupCatalogOptions(rows, "t6_2h_claymore@1")[0].id).toBe("T6_2H_CLAYMORE@1");
  expect(groupCatalogOptions(rows, "T6_2H_CLAYMORE")[0].id).toBe("T6_2H_CLAYMORE");
});
it("merges grouped rows by base item so a local entry does not repeat a remote one", () => {
  const remote = [{ ...row("T4_2H_BOW", "Adept's Bow"), tiers: [4, 8] as [number, number] }];
  expect(mergeCatalogOptions(remote, [row("T5_2H_BOW")], (i) => catalogBaseKey(i.id))).toEqual(
    remote,
  );
});
