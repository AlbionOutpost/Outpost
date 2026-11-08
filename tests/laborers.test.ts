import { expect, it } from "vitest";
import {
  initialLaborers,
  journalId,
  laborerLoot,
  laborerReturnFactor,
  laborers,
  type LaborerInput,
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
  input.tax = 8; // The reference case is priced without Premium.
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
  // Return on cost is profit ÷ full-journal cost: 389.568 / 1,000 = 38.9568 %.
  expect(r.roi).toBeCloseTo(38.9568, 9);
  expect(r).not.toHaveProperty("margin");
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

it("rejects wrong-side and legacy observations while preserving explicit manual prices", () => {
  const input = initialLaborers("europe");
  input.saleMode = "listing";
  input.tax = 0;
  input.setupFee = 0;
  const observed = (value: number, execution?: LaborerInput["prices"][string]["execution"]) => ({
    value,
    execution,
    manual: false,
    region: "europe" as const,
    city: "Lymhurst" as const,
    quality: 1,
    observedAt: new Date().toISOString(),
  });
  input.prices[journalId("WARRIOR", 4, true)] = observed(100, "instant-purchase");
  for (const item of laborerLoot("WARRIOR", 4)!.items)
    input.prices[item.id] = observed(1000, "listing");
  expect(laborers(input)).toMatchObject({ complete: true, profit: 17100 });
  // Listing asks provide no evidence that an instant sale can execute at that value.
  expect(laborers({ ...input, saleMode: "instant" })).toMatchObject({
    complete: false,
    coverage: 0,
    lootGross: 0,
  });
  const legacy = structuredClone(input);
  for (const p of Object.values(legacy.prices)) delete p.execution;
  expect(laborers(legacy)).toMatchObject({
    complete: false,
    coverage: 0,
    cost: null,
    profit: null,
  });
  expect(laborers({ ...input, buyOrder: true })).toMatchObject({
    complete: false,
    cost: null,
    profit: null,
  });
  input.prices[journalId("WARRIOR", 4, true)].execution = "buy-order";
  expect(laborers({ ...input, buyOrder: true })).toMatchObject({ complete: true, cost: 100 });
  for (const p of Object.values(input.prices)) p.manual = true;
  expect(laborers({ ...input, saleMode: "instant" })).toMatchObject({
    complete: true,
    profit: 17100,
  });
});

function emptyJournalScenario() {
  const input = initialLaborers("europe");
  input.sellEmpty = true;
  input.tax = 0;
  input.setupFee = 0;
  for (const row of laborerLoot(input.type, input.journalTier)!.items)
    input.prices[row.id] = manual(0);
  input.prices[journalId(input.type, input.journalTier, true)] = manual(0);
  input.prices[journalId(input.type, input.journalTier, false)] = manual(0);
  return input;
}
it("preserves a tiny journal purchase cost while withholding an infinite return ratio", () => {
  const input = emptyJournalScenario();
  input.prices[journalId(input.type, input.journalTier, true)] = manual(1e-300);
  input.prices[journalId(input.type, input.journalTier, false)] = manual(1e12);
  expect(laborers(input)).toMatchObject({
    complete: true,
    cost: 1e-300,
    profit: 1e12,
    roi: null,
  });
});
it("bounds empty-journal gross sales before tax, including a scaled exact boundary", () => {
  const input = emptyJournalScenario();
  input.journals = 10000;
  const empty = journalId(input.type, input.journalTier, false);
  input.prices[empty] = manual(100_000_000);
  expect(laborers(input)).toMatchObject({ complete: true, emptyNet: 1e12, profit: 1e12 });
  // Ten thousand units add one silver when the unit price increases by0.0001.
  input.prices[empty] = manual(100_000_000.0001);
  expect(() => laborers(input)).toThrow("Laborer totals");
  expect(() => laborers({ ...input, tax: 100 })).toThrow("Laborer totals");
  input.prices[empty] = manual(1e12);
  expect(() => laborers(input)).toThrow("Laborer totals");
});
it("bounds combined sale streams and fees even when each individual stream fits", () => {
  const input = emptyJournalScenario();
  const empty = journalId(input.type, input.journalTier, false);
  input.prices[empty] = manual(1e12);
  input.prices.T4_METALBAR = manual(1);
  expect(() => laborers(input)).toThrow("Laborer totals");
  input.prices.T4_METALBAR = manual(0);
  // Gross1tn and sale fees2tn must fail even though net/profit are exactly-1tn.
  expect(() => laborers({ ...input, saleMode: "listing", tax: 100, setupFee: 100 })).toThrow(
    "Laborer totals",
  );
});
it("bounds net loss separately from sale and purchase totals", () => {
  const input = emptyJournalScenario();
  input.saleMode = "listing";
  input.tax = 100;
  input.setupFee = 100;
  input.prices[journalId(input.type, input.journalTier, false)] = manual(500e9);
  input.prices[journalId(input.type, input.journalTier, true)] = manual(500e9);
  // Gross500bn, fees1tn and cost500bn produce a supported loss of exactly1tn.
  expect(laborers(input)).toMatchObject({ emptyNet: -500e9, cost: 500e9, profit: -1e12 });
  input.prices[journalId(input.type, input.journalTier, true)] = manual(600e9);
  expect(() => laborers(input)).toThrow("Laborer totals");
});
