import { describe, expect, it } from "vitest";
import sourceEquipment from "@/lib/albion/source-equipment.json";
import { isTwoHanded, offHandShadow } from "@/lib/albion/two-handed";

describe("two-handed weapons", () => {
  it("recognises two-handed ids with tier and enchantment", () => {
    expect(isTwoHanded("T4_2H_BOW")).toBe(true);
    expect(isTwoHanded("T8_2H_CLAYMORE@3")).toBe(true);
    expect(isTwoHanded("T4_MAIN_SWORD")).toBe(false);
    expect(isTwoHanded("T5_2H_TOOL_TRACKING")).toBe(false);
    expect(isTwoHanded(undefined)).toBe(false);
  });
  it("agrees with the catalog's twoHanded flag for every sourced family", () => {
    const families = (
      Array.isArray(sourceEquipment)
        ? sourceEquipment
        : Object.values(sourceEquipment).find(Array.isArray)
    ) as { code: string; twoHanded?: boolean; tiers: number[] }[];
    for (const family of families.filter((f) => f.twoHanded !== undefined))
      expect(isTwoHanded(`T${family.tiers[0] ?? 4}_${family.code}`), family.code).toBe(
        family.twoHanded,
      );
  });
  it("shadows the off hand only when it is empty and the main hand is two-handed", () => {
    expect(offHandShadow("T4_2H_BOW", "")).toBe("T4_2H_BOW");
    expect(offHandShadow("T4_2H_BOW", "T4_OFF_SHIELD")).toBeNull();
    expect(offHandShadow("T4_MAIN_SWORD", "")).toBeNull();
  });
});
