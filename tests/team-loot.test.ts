import { expect, it } from "vitest";
import { allocateLoot, lootConfiguration, lootSave } from "@/lib/groups/loot";
const split = (
  pool: number,
  participants = [
    { userId: "a", shares: 1 },
    { userId: "b", shares: 1 },
  ],
  expenses: { label: string; silver: number }[] = [],
) => ({ pool, participants, expenses, notes: "" });
it("deducts manual whole-silver expenses before exact weighted payouts", () => {
  const result = allocateLoot(
    split(
      1000,
      [
        { userId: "a", shares: 1 },
        { userId: "b", shares: 2 },
        { userId: "c", shares: 3 },
      ],
      [{ label: "Repairs", silver: 100 }],
    ),
  );
  expect(result.net).toBe(900);
  expect(result.payouts.map((row) => row.silver)).toEqual([150, 300, 450]);
  expect(result.expenses).toBe(100);
  expect(result.roundingSilver).toBe(0);
});
it("assigns the explicit remainder by fractional entitlement then stable ID, independently of input order", () => {
  const a = allocateLoot(split(100, undefined, [{ label: "Cost", silver: 1 }]));
  expect(a.payouts).toMatchObject([
    { userId: "a", baseSilver: 49, roundingSilver: 1, silver: 50 },
    { userId: "b", baseSilver: 49, roundingSilver: 0, silver: 49 },
  ]);
  const b = allocateLoot(
    split(99, [
      { userId: "b", shares: 1 },
      { userId: "a", shares: 1 },
    ]),
  );
  expect(b.payouts.find((row) => row.userId === "a")!.silver).toBe(50);
  const weighted = allocateLoot(
    split(5, [
      { userId: "a", shares: 1 },
      { userId: "b", shares: 2 },
    ]),
  );
  expect(weighted.payouts.map((row) => row.silver)).toEqual([2, 3]);
});
it("conserves silver at the maximum supported integer and with a fully spent/zero pool", () => {
  const max = allocateLoot(
    split(Number.MAX_SAFE_INTEGER, [
      { userId: "a", shares: 1000 },
      { userId: "b", shares: 999 },
      { userId: "c", shares: 2 },
    ]),
  );
  expect(
    max.payouts.reduce((sum, row) => sum + BigInt(row.silver), 0n) + BigInt(max.expenses),
  ).toBe(9007199254740991n);
  expect(allocateLoot(split(0)).payouts.map((row) => row.silver)).toEqual([0, 0]);
  expect(allocateLoot(split(20, undefined, [{ label: "All costs", silver: 20 }])).net).toBe(0);
});
it("rejects negative/fractional/unsafe inputs, expense overflow, duplicate IDs and missing revisions", () => {
  for (const pool of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
    expect(lootConfiguration.safeParse(split(pool)).success).toBe(false);
  expect(
    lootConfiguration.safeParse(split(10, undefined, [{ label: "Over", silver: 11 }])).success,
  ).toBe(false);
  expect(
    lootConfiguration.safeParse(
      split(Number.MAX_SAFE_INTEGER, undefined, [
        { label: "A", silver: Number.MAX_SAFE_INTEGER },
        { label: "B", silver: Number.MAX_SAFE_INTEGER },
      ]),
    ).success,
  ).toBe(false);
  expect(
    lootConfiguration.safeParse(
      split(10, [
        { userId: "a", shares: 1 },
        { userId: "a", shares: 2 },
      ]),
    ).success,
  ).toBe(false);
  expect(lootConfiguration.safeParse(split(10, [{ userId: "a", shares: 0 }])).success).toBe(false);
  expect(lootConfiguration.safeParse(split(10, [])).success).toBe(false);
  expect(
    lootSave.safeParse({ id: "saved", title: "Test split", configuration: split(10) }).success,
  ).toBe(false);
});

// Guild tax and percentage expenses: expected values worked by hand (docs/CALCULATORS.md).
const team = [
  { userId: "a", shares: 1 },
  { userId: "b", shares: 1 },
];
it("takes the guild tax and percentage expenses from the gross pool before sharing", () => {
  // 1,000,000 pool · 10% tax = 100,000 · repairs 50,000 · caller 5% = 50,000 → 800,000 shared.
  const result = allocateLoot({
    pool: 1_000_000,
    notes: "",
    guildTaxPercent: 10,
    expenses: [
      { label: "Repairs", kind: "silver", silver: 50_000 },
      { label: "Caller", kind: "percent", percent: 5 },
    ],
    participants: team,
  });
  expect(result.guildTax).toBe(100_000);
  expect(result.expenses).toBe(100_000);
  expect(result.expenseRows.map((row) => [row.kind, row.percent, row.silver])).toEqual([
    ["silver", null, 50_000],
    ["percent", 5, 50_000],
  ]);
  expect(result.net).toBe(800_000);
  expect(result.payouts.map((row) => row.silver)).toEqual([400_000, 400_000]);
});
it("rounds each rate down to whole silver and shares the leftover", () => {
  // 999 × 12.5% = 124.875 → 124; 999 × 33.3% = 332.667 → 332; 999 − 124 − 332 = 543 → 272 + 271.
  const result = allocateLoot({
    pool: 999,
    notes: "",
    guildTaxPercent: 12.5,
    expenses: [{ label: "Scout", kind: "percent", percent: 33.3 }],
    participants: team,
  });
  expect([result.guildTax, result.expenses, result.net]).toEqual([124, 332, 543]);
  expect(result.payouts.map((row) => row.silver)).toEqual([272, 271]);
  expect(result.guildTax + result.expenses + 272 + 271).toBe(999);
  const all = allocateLoot({ ...split(5000), guildTaxPercent: 100 });
  expect([all.guildTax, all.net]).toEqual([5000, 0]);
});
it("reads a split saved before kinds and guild tax exactly as it was", () => {
  const old = allocateLoot(split(1000, undefined, [{ label: "Repairs", silver: 100 }]));
  expect(old.guildTaxPercent).toBe(0);
  expect(old.guildTax).toBe(0);
  expect(old.expenseRows).toEqual([
    { label: "Repairs", kind: "silver", percent: null, silver: 100 },
  ]);
  expect(old.payouts.map((row) => row.silver)).toEqual([450, 450]);
});
it("rejects rates past one decimal or 100%, a missing percentage, and deductions over the pool", () => {
  const base = { pool: 100, notes: "", participants: team };
  const parse = (extra: object) => lootConfiguration.safeParse({ ...base, expenses: [], ...extra });
  expect(parse({ guildTaxPercent: 12.34 }).success).toBe(false);
  expect(parse({ guildTaxPercent: 100.1 }).success).toBe(false);
  expect(parse({ guildTaxPercent: -1 }).success).toBe(false);
  expect(parse({ expenses: [{ label: "Cut", kind: "percent" }] }).success).toBe(false);
  expect(
    parse({ guildTaxPercent: 60, expenses: [{ label: "Cut", kind: "percent", percent: 50 }] })
      .success,
  ).toBe(false);
  expect(
    parse({ guildTaxPercent: 60, expenses: [{ label: "Cut", kind: "silver", silver: 40 }] })
      .success,
  ).toBe(true);
});
