import { expect, it } from "vitest";
import {
  initialLaborers,
  journalId,
  laborerLoot,
  laborerReturnFactor,
  laborers,
} from "../src/lib/albion/laborers";
const manual = (value: number) => ({
  value,
  manual: true,
  observedAt: null,
  region: null,
  city: null,
  quality: 1,
});
it("uses the house/journal happiness table", () => {
  expect(laborerReturnFactor(4, 4)).toBe(1.075);
  expect(laborerReturnFactor(8, 8)).toBe(1.2);
  expect(laborerReturnFactor(8, 4)).toBe(1.5);
  expect(laborerReturnFactor(2, 5)).toBeNull();
});
it("weights blacksmith loot 7 : 2 : 1 across bars, planks and cloth", () => {
  const loot = laborerLoot("WARRIOR", 4)!;
  expect(loot.lootAmount).toBe(16);
  const share = (prefix: string) =>
    loot.items.filter((i) => i.id.startsWith(prefix)).reduce((a, b) => a + b.share, 0);
  expect(share("T4_METALBAR")).toBeCloseTo(0.7, 12);
  expect(share("T4_PLANKS")).toBeCloseTo(0.2, 12);
  expect(share("T4_CLOTH")).toBeCloseTo(0.1, 12);
  expect(loot.items.map((i) => i.id)).toContain("T4_METALBAR_LEVEL1@1");
});
it("prices a T4 blacksmith run by hand", () => {
  const input = initialLaborers("europe");
  input.sellEmpty = true;
  for (const item of laborerLoot("WARRIOR", 4)!.items)
    input.prices[item.id] = manual(
      item.id.includes("METALBAR") ? 100 : item.id.includes("PLANKS") ? 50 : 20,
    );
  input.prices[journalId("WARRIOR", 4, true)] = manual(1000);
  input.prices[journalId("WARRIOR", 4, false)] = manual(100);
  const r = laborers(input);
  if (!r.valid) throw new Error("expected valid");
  // 16 × 1.075 = 17.2 units worth 0.7×100 + 0.2×50 + 0.1×20 = 82 each → 1,410.4 gross.
  expect(r.unitsPerJournal).toBeCloseTo(17.2, 12);
  expect(r.valuePerUnit).toBeCloseTo(82, 12);
  expect(r.lootGross).toBeCloseTo(1410.4, 9);
  // 8% instant-sale tax: 1,297.568 loot + 92 empty journal − 1,000 full journal.
  expect(r.profit).toBeCloseTo(389.568, 9);
  expect(r.complete).toBe(true);
});
it("reports a lower bound when loot is unpriced and rejects invalid houses", () => {
  const input = initialLaborers("europe");
  input.prices.T4_METALBAR = manual(100);
  input.prices[journalId("WARRIOR", 4, true)] = manual(1000);
  const r = laborers(input);
  if (!r.valid) throw new Error("expected valid");
  expect(r.complete).toBe(false);
  expect(r.coverage).toBeCloseTo(13223 / 20000, 12);
  expect(laborers({ ...input, houseTier: 2, journalTier: 6 }).valid).toBe(false);
  expect(() => laborers({ ...input, lootCity: "Black Market" })).toThrow();
});
