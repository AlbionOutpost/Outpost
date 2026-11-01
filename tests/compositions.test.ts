import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { compositionInput, equipmentChoice } from "../src/lib/compositions/validation";
import { canEditShared, canManageMembers } from "../src/lib/groups/permissions";
const slot = () => ({
  id: randomUUID(),
  playerName: "",
  role: "Tank",
  customRole: "",
  mandatory: true,
  substitute: "",
  notes: "",
  sourceBuildId: null,
  equipment: [],
});
const base = () => ({
  title: "Test composition",
  description: "",
  region: "europe",
  contentType: "ZvZ",
  visibility: "PRIVATE",
  groupId: null,
  notes: "",
  slots: Array.from({ length: 20 }, slot),
});
describe("composition invariants", () => {
  it("accepts solo and 20/100-player rosters", () => {
    for (const n of [1, 2, 5, 10, 20, 100])
      expect(
        compositionInput.safeParse({ ...base(), slots: Array.from({ length: n }, slot) }).success,
      ).toBe(true);
  });
  it("rejects empty, oversized and duplicate member rosters", () => {
    expect(compositionInput.safeParse({ ...base(), slots: [] }).success).toBe(false);
    expect(
      compositionInput.safeParse({ ...base(), slots: Array.from({ length: 101 }, slot) }).success,
    ).toBe(false);
    const s = slot();
    expect(compositionInput.safeParse({ ...base(), slots: [s, s] }).success).toBe(false);
  });
  it("requires membership destination only for group visibility", () => {
    expect(compositionInput.safeParse({ ...base(), visibility: "GROUP" }).success).toBe(false);
    expect(compositionInput.safeParse({ ...base(), groupId: "foreign-group" }).success).toBe(false);
  });
  it("rejects invented abilities, unknown items and wrong equipment slots", () => {
    const e = {
      slot: "Main hand",
      itemId: "T6_MAIN_AXE@1",
      quality: 1,
      abilities: { E: "Blood Bandit" },
      alternatives: [],
    };
    expect(equipmentChoice.safeParse(e).success).toBe(true);
    expect(equipmentChoice.safeParse({ ...e, abilities: { E: "Invented Spell" } }).success).toBe(
      false,
    );
    expect(equipmentChoice.safeParse({ ...e, slot: "Helmet" }).success).toBe(false);
    expect(equipmentChoice.safeParse({ ...e, itemId: "T6_FAKE" }).success).toBe(false);
  });
  it("restricts officer/member powers", () => {
    expect(canEditShared("OFFICER")).toBe(true);
    expect(canManageMembers("OFFICER")).toBe(false);
    expect(canEditShared("MEMBER")).toBe(false);
    expect(canEditShared(null)).toBe(false);
  });
});
