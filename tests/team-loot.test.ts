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
