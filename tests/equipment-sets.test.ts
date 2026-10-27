import { describe, it, expect } from "vitest";
import { equipmentSet, equipmentSets, templateEquipment } from "../src/lib/albion/equipment-sets";
import { memberSlot } from "../src/lib/compositions/validation";
const id = "bced1850-1359-4c67-85db-e691a2fc6c51";
describe("whole equipment snapshots", () => {
  it("creates a full ten-slot template with supported consumables, without invented ability selections", () => {
    const rows = templateEquipment("battleaxe");
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map((r) => r.slot)).size).toBe(10);
    expect(rows.find((r) => r.slot === "Food")?.itemId).toBe("T4_MEAL_STEW");
    expect(rows.find((r) => r.slot === "Potion")?.itemId).toBe("T4_POTION_HEAL");
    expect(rows.every((r) => Object.keys(r.abilities).length === 0)).toBe(true);
  });
  it("rejects duplicate slots, forged spells and mismatched alternatives", () => {
    const row = templateEquipment("battleaxe")[0];
    for (const equipment of [
      [row, row],
      [{ ...row, abilities: { E: "Made up spell" } }],
      [{ ...row, alternatives: ["T4_BAG"] }],
    ])
      expect(equipmentSet.safeParse({ id, name: "Swap", equipment }).success).toBe(false);
  });
  it("caps set counts and unique identities while accepting legacy empty collections", () => {
    expect(equipmentSets.parse(undefined)).toEqual([]);
    const set = { id, name: "Spare", equipment: templateEquipment("battleaxe") };
    expect(equipmentSets.safeParse([set, set]).success).toBe(false);
    expect(equipmentSets.safeParse(Array(6).fill(set)).success).toBe(false);
    const member = memberSlot.parse({
      id,
      playerName: "",
      role: "Tank",
      customRole: "",
      mandatory: true,
      substitute: "",
      notes: "",
      sourceBuildId: null,
      equipment: [],
    });
    expect(member.equipmentSets).toEqual([]);
  });
});
