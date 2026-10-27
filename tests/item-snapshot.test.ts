import { expect, it } from "vitest";
import { normalizeItemSnapshot } from "../src/lib/catalog/item-snapshot";
import { equipmentName, findEquipment } from "../src/lib/albion/equipment-catalog";
import { recipeFor } from "../src/lib/albion/recipes";

const row = {
  uniqueName: "T4_MAIN_AXE",
  tier: 4,
  enchantmentLevel: 0,
  slotType: "mainhand",
  categoryId: "axe",
  revision: 337183,
  localizedNames: { "EN-US": "Adept's Battleaxe" },
  itemPower: 700,
  activeSlots: {
    "1": [{ uniqueName: "RENDINGSTRIKE", localizedNames: { "EN-US": "Rending Strike" } }],
  },
  passiveSlots: { "1": [{ uniqueName: "AXE_PASSIVE", localizedNames: { "EN-US": "Deep Cuts" } }] },
  enchantments: { enchantments: [{ enchantmentLevel: 1, itemPower: 800 }] },
};
it("imports explicit identities and spell slots while leaving unlocks and variant spell inheritance unknown", () => {
  const result = normalizeItemSnapshot([row], "mainhand", "https://example.org/pinned.json");
  expect(result.items.map((i) => [i.id, i.itemPower])).toEqual([
    ["T4_MAIN_AXE", 700],
    ["T4_MAIN_AXE@1", 800],
  ]);
  expect(result.items[0].abilities.map((a) => [a.slot, a.name, a.unlock])).toEqual([
    ["Q", "Rending Strike", null],
    ["Passive", "Deep Cuts", null],
  ]);
  expect(result.items[1].abilities).toEqual([]);
  expect(result.items[0].recipe).toBeNull();
});
it("quarantines unsupported and inconsistent source identities without guessing corrections", () => {
  const result = normalizeItemSnapshot(
    [
      { ...row, uniqueName: "UNIQUE_TEST" },
      { ...row, enchantmentLevel: 1 },
    ],
    "mainhand",
    "https://example.org/source",
  );
  expect(result.items).toEqual([]);
  expect(result.excluded).toHaveLength(2);
});
it("rejects duplicate identities, foreign slots and invalid power before activation", () => {
  for (const rows of [[row, row], [{ ...row, slotType: "head" }], [{ ...row, itemPower: -1 }]])
    expect(() => normalizeItemSnapshot(rows, "mainhand", "https://example.org/source")).toThrow();
});
it("exposes only source-enumerated stew and healing variants and keeps them out of rune enchanting", () => {
  expect(equipmentName("T8_MEAL_STEW@3")).toBe("Beef Stew · T8.3");
  expect(equipmentName("T2_POTION_HEAL")).toBe("Minor Healing Potion · T2.0");
  expect(findEquipment("T5_MEAL_STEW")).toBeNull();
  expect(findEquipment("T4_POTION_HEAL@4")).toBeNull();
  for (const enchantFamily of ["MEAL_STEW", "POTION_HEAL"])
    expect(() =>
      recipeFor({
        kind: "enchanting",
        recipeId: "enchanting",
        enchantFamily,
        tier: 4,
        fromEnchant: 0,
        toEnchant: 1,
      }),
    ).toThrow();
});
