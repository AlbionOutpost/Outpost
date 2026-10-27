import { it, expect } from "vitest";
import { findEquipment, equipmentId, equipmentFamilies } from "../src/lib/albion/equipment-catalog";
import { abilitiesFor } from "../src/lib/albion/equipment-abilities";
import { equipmentChoice, validHandCombination } from "../src/lib/albion/equipment-validation";
import snapshot from "../data/catalog/ao-snapshot-20260712.json";
it("makes every imported identity selectable without manufacturing unsupported tier/enchantment combinations", () => {
  for (const item of snapshot.items) expect(findEquipment(item.id)?.family.slot).toBe(item.slot);
  const imported = new Set(snapshot.items.map((i) => i.id));
  for (const f of equipmentFamilies)
    for (const tier of f.tiers)
      for (const enchant of f.enchants) {
        const id = equipmentId(f, tier, enchant);
        if (findEquipment(id)) expect(imported.has(id)).toBe(true);
      }
  expect(findEquipment("T2_2H_BOW@4")).toBeNull();
  expect(findEquipment("T8_MAIN_HOLYSTAFF")).not.toBeNull();
});
it("uses actual source spell names and enforces item identity and two-handed loadouts", () => {
  expect(abilitiesFor("T4_MAIN_AXE").Q).toContain("Rending Rage");
  expect(
    equipmentChoice.safeParse({
      slot: "Main hand",
      itemId: "T4_2H_BOW",
      quality: 1,
      abilities: { E: "Blood Bandit" },
      alternatives: [],
    }).success,
  ).toBe(false);
  expect(
    validHandCombination([
      { slot: "Main hand", itemId: "T4_2H_BOW" },
      { slot: "Off hand", itemId: "T4_OFF_SHIELD" },
    ]),
  ).toBe(false);
  expect(
    validHandCombination([
      { slot: "Main hand", itemId: "T4_MAIN_AXE" },
      { slot: "Off hand", itemId: "T4_OFF_SHIELD" },
    ]),
  ).toBe(true);
});

it("does not extrapolate starter spells to unsupported beginner tiers", () => {
  expect(abilitiesFor("T2_MAIN_AXE")).toEqual({});
});
