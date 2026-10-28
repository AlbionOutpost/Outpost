import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fishConversion, fishFame } from "../src/lib/albion/fishing";
import { parseJournalProgress, type JournalEntry } from "../src/lib/journal-progress";

const conversion = {
  quantity: 10,
  choppedPerFish: 3,
  purchasePrice: 100,
  rawSalePrice: 120,
  choppedSalePrice: 50,
  purchaseFee: 2.5,
  saleFee: 10,
  choppingCost: 50,
};
describe("fish processing accounting", () => {
  it("distinguishes cash profit from the opportunity cost of selling an owned catch", () => {
    // Buy ten fish: 1000 + 25 fee; processing 50. Sell 30 chops: 1500 - 150 fees.
    // Raw sale returns 1200 - 120 fees. Processing improves that alternative by 220.
    const result = fishConversion(conversion);
    expect(result).toMatchObject({
      quantity: 30,
      upfront: 1075,
      choppedRevenue: 1350,
      rawRevenue: 1080,
      choppedProfit: 275,
      rawProfit: 55,
      advantage: 220,
    });
    expect(result.breakEven).toBeCloseTo(1075 / 27);
    expect(result.costPerChop).toBeCloseTo(1075 / 30);
  });
  it("keeps missing costs and sale observations unknown while permitting an explicit manual zero", () => {
    expect(fishConversion({ ...conversion, purchasePrice: null })).toMatchObject({
      upfront: null,
      choppedProfit: null,
      rawProfit: null,
      breakEven: null,
      advantage: 220,
    });
    expect(fishConversion({ ...conversion, rawSalePrice: null })).toMatchObject({
      rawProfit: null,
      advantage: null,
    });
    expect(fishConversion({ ...conversion, choppedSalePrice: null }).choppedProfit).toBeNull();
    expect(fishConversion({ ...conversion, purchasePrice: 0 }).choppedProfit).toBe(1300);
    expect(fishConversion({ ...conversion, saleFee: 100 }).breakEven).toBeNull();
  });
  it("rejects impossible quantities, negative costs, invalid fees and excessive totals", () => {
    for (const values of [
      { quantity: 0 },
      { quantity: 1.2 },
      { choppedPerFish: 0 },
      { purchasePrice: -1 },
      { choppingCost: -1 },
      { saleFee: 101 },
      { purchasePrice: Infinity },
      { quantity: 1000000, purchasePrice: 1e12 },
    ])
      expect(() => fishConversion({ ...conversion, ...values })).toThrow();
  });
  it("rounds whole fish up for an entered fame target without inventing level or LP thresholds", () => {
    const result = fishFame({
      target: 10000,
      famePerFish: 210,
      purchasePrice: 1000,
      purchaseFee: 2.5,
    });
    expect(result).toMatchObject({ needed: 48, actualFame: 10080 });
    expect(result.cost).toBeCloseTo(49200);
    expect(result.silverPerThousand).toBeCloseTo(102500 / 21);
    for (const famePerFish of [null, 0])
      expect(
        fishFame({ target: 10000, famePerFish, purchasePrice: 1000, purchaseFee: 0 }),
      ).toMatchObject({ needed: null, cost: null, actualFame: null, silverPerThousand: null });
    expect(
      fishFame({ target: 100, famePerFish: 20, purchasePrice: null, purchaseFee: 0 }),
    ).toMatchObject({ needed: 5, actualFame: 100, cost: null });
    expect(() =>
      fishFame({ target: 1e12, famePerFish: 0.1, purchasePrice: 1, purchaseFee: 0 }),
    ).toThrow();
  });
  it("pins imported recipe yields and fame separately and excludes captured market prices", () => {
    const fish = JSON.parse(readFileSync("public/library/grind-fishing.json", "utf8"));
    expect(fish).toHaveLength(41);
    expect(
      fish.find((f: { id: string }) => f.id === "T7_FISH_FRESHWATER_FOREST_RARE"),
    ).toMatchObject({ name: "Deadwater Eel", choppedPerFish: 30, historicalFame: 225 });
    expect(JSON.stringify(fish)).not.toMatch(/price|volume|2024/i);
  });
});

describe("regional device journal backups", () => {
  const entries: JournalEntry[] = JSON.parse(
    readFileSync("public/library/grind-journal.json", "utf8"),
  );
  const ids = new Set(entries.map((e) => e.entryId));
  const backup = (completed = [entries[0].entryId], region = "europe") =>
    JSON.stringify({ version: 1, region, completed });
  it("restores only unique known objectives for the selected region", () => {
    expect(entries).toHaveLength(1784);
    expect(ids.size).toBe(1784);
    expect(parseJournalProgress(backup(), "europe", ids)).toEqual([entries[0].entryId]);
    expect(parseJournalProgress(backup([]), "europe", ids)).toEqual([]);
    const dotted = entries.find((e) => e.entryId.includes("."))!;
    expect(parseJournalProgress(backup([dotted.entryId]), "europe", ids)).toEqual([dotted.entryId]);
  });
  it("denies other regions, forged IDs, duplicates and unversioned account objects", () => {
    for (const raw of [
      backup(undefined, "asia"),
      backup(["JOURNAL_NOT_A_REAL_OBJECTIVE"]),
      backup([entries[0].entryId, entries[0].entryId]),
      backup(["__proto__"]),
      JSON.stringify({ version: 1, region: "europe", completed: [], user_id: "old-account" }),
      "null",
      "{}",
      "broken",
    ])
      expect(() => parseJournalProgress(raw, "europe", ids)).toThrow();
  });
  it("bounds file and collection sizes before replacing progress", () => {
    expect(() => parseJournalProgress(" ".repeat(512001), "europe", ids)).toThrow(/512KB/);
    expect(() =>
      parseJournalProgress(
        backup(Array.from({ length: 5001 }, (_, i) => `JOURNAL_FAKE_${i}`)),
        "europe",
        ids,
      ),
    ).toThrow();
  });
});
