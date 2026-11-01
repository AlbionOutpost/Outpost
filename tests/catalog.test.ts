import { it, expect } from "vitest";
import { catalogBundle, catalogItem } from "../src/lib/catalog/validation";
import { itemIconUrl } from "../src/lib/albion/item-renderer";
const item = {
  id: "T4_MAIN_AXE",
  name: "Battleaxe",
  slot: "Main hand",
  tier: 4,
  enchantment: 0,
  itemPower: null,
  abilities: [],
  recipe: null,
};
it("rejects metadata identity mismatch, duplicate IDs and absent rights provenance", () => {
  expect(catalogItem.safeParse(item).success).toBe(true);
  expect(catalogItem.safeParse({ ...item, tier: 5 }).success).toBe(false);
  expect(catalogItem.safeParse({ ...item, slot: "Helmet" }).success).toBe(false);
  expect(catalogItem.safeParse({ ...item, id: "T4_MAIN_AXE@2", enchantment: 2 }).success).toBe(
    true,
  );
  const b = {
    version: "v1",
    sourceUrl: "https://example.org/source",
    rightsReference: "Original authored factual fixture for tests",
    items: [item],
  };
  expect(catalogBundle.safeParse(b).success).toBe(true);
  expect(catalogBundle.safeParse({ ...b, items: [item, item] }).success).toBe(false);
  expect(catalogBundle.safeParse({ ...b, rightsReference: "" }).success).toBe(false);
});
it("constructs render URLs only for valid item IDs and bounded parameters", () => {
  expect(itemIconUrl("T4_MAIN_AXE@1", 3)).toContain("T4_MAIN_AXE%401.png?quality=3");
  for (const id of ["https://evil.test", "../../secret", "T9_BAG", "T4_BAG?x=1"])
    expect(() => itemIconUrl(id)).toThrow();
  expect(() => itemIconUrl("T4_BAG", 6)).toThrow();
  // Untiered game items (tokens, treasures) have renders too.
  expect(itemIconUrl("QUESTITEM_TOKEN_AVALON")).toContain("QUESTITEM_TOKEN_AVALON.png");
  expect(itemIconUrl("TREASURE_AVALON_RARITY1")).toContain("TREASURE_AVALON_RARITY1.png");
});

it("rejects malformed recipes before any catalog transaction can begin", () => {
  const material = { id: "T4_METALBAR", quantity: 16, returnable: true };
  const recipe = { outputCount: 1, materials: [material] };
  expect(catalogItem.safeParse({ ...item, recipe }).success).toBe(true);
  for (const invalid of [
    { ...recipe, outputCount: 0 },
    { ...recipe, outputCount: 1e9 },
    { ...recipe, materials: [] },
    { ...recipe, materials: [material, material] },
    { ...recipe, materials: [{ ...material, id: item.id }] },
    { ...recipe, materials: [{ ...material, id: "T9_METALBAR" }] },
    { ...recipe, materials: [{ ...material, id: "T4_METALBAR@9" }] },
    { ...recipe, materials: [{ ...material, quantity: 0.5 }] },
    { ...recipe, materials: [{ ...material, quantity: 1e9 }] },
  ])
    expect(catalogItem.safeParse({ ...item, recipe: invalid }).success).toBe(false);
});

it("requires meaningful, unique ability choices and credential-free source references", () => {
  const ability = {
    id: "rending-strike",
    name: "Rending Strike",
    slot: "Q",
    unlock: null,
    sourceUrl: "https://albiononline.com/news/basic-builds-battleaxe",
  };
  expect(catalogItem.safeParse({ ...item, abilities: [ability] }).success).toBe(true);
  for (const invalid of [
    [ability, ability],
    [{ ...ability, id: " " }],
    [{ ...ability, name: "" }],
    [{ ...ability, slot: " " }],
    [{ ...ability, sourceUrl: "https://user:secret@example.org/source" }],
  ])
    expect(catalogItem.safeParse({ ...item, abilities: invalid }).success).toBe(false);
});

it("optional image outages return a cached original fallback instead of breaking pages", async () => {
  const { vi } = await import("vitest");
  const fetch = vi.fn().mockRejectedValue(new Error("outage"));
  vi.stubGlobal("fetch", fetch);
  try {
    const { renderIcon } = await import("../src/lib/albion/icon-cache");
    const a = await renderIcon("T4_BAG", 1);
    expect(a.available).toBe(false);
    expect(a.type).toBe("image/svg+xml");
    await renderIcon("T4_BAG", 1);
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("known factual names do not imply unverified equipment abilities", async () => {
  const { equipmentName, findEquipment } = await import("../src/lib/albion/equipment-catalog");
  expect(equipmentName("T6_MAIN_SWORD")).toBe("Broadsword · T6.0");
  expect(equipmentName("T6_2H_BOW@2")).toBe("Bow · T6.2");
  expect(findEquipment("T6_2H_BOW@2")).toMatchObject({
    family: { code: "2H_BOW", twoHanded: true, abilities: {} },
  });
  expect(equipmentName("T4_UNKNOWN_TEST")).toBe("T4_UNKNOWN_TEST");
});
