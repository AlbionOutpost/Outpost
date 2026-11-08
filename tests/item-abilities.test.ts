import { expect, it } from "vitest";
import { itemAbilities } from "../src/lib/albion/equipment-abilities";
import archived from "../src/lib/albion/archived-item-spells.json" with { type: "json" };

const charge = { id: "CLAYMORECHARGE", name: "Charge", slot: "E", unlock: null };
it("falls back to the archived build library's spells for that exact item, tagged", () => {
  const rows = itemAbilities("T8_2H_CLAYMORE", []);
  const recorded = (archived as Record<string, { id: string }[]>).T8_2H_CLAYMORE;
  expect(rows).toHaveLength(recorded.length);
  expect(rows.every((row) => row.source === "archive")).toBe(true);
  expect(rows.map((row) => row.id).toSorted()).toEqual(recorded.map((r) => r.id).toSorted());
  // Slots read in the game's order
  expect([...new Set(rows.map((row) => row.slot))]).toEqual(["Q", "W", "E", "Passive"]);
});
it("keeps the snapshot's own entries and adds only what the archive alone lists", () => {
  const rows = itemAbilities("T4_2H_CLAYMORE", [charge]);
  expect(rows.filter((row) => row.id === "CLAYMORECHARGE")).toEqual([
    { ...charge, source: "snapshot" },
  ]);
  expect(rows.some((row) => row.source === "archive")).toBe(true);
});
it("invents nothing for items neither source records", () => {
  expect(itemAbilities("T4_BAG", [])).toEqual([]);
  expect(itemAbilities("T2_2H_CLAYMORE", [])).toEqual([]);
});
