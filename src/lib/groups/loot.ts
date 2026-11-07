import { z } from "zod";

const silver = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
/** A rate in percent, 0–100, with at most one decimal (12.5%). */
export const tenthPercent = z
  .number()
  .min(0)
  .max(100)
  .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, "Use at most one decimal");
/** Tenths of a percent as an exact integer: 12.5% → 125n. */
const tenths = (percent: number) => BigInt(Math.round(percent * 10));
/** Whole silver a rate takes from the pool, rounded down; the leftover silver stays in the share. */
const cut = (pool: bigint, percent: number) => (pool * tenths(percent)) / 1000n;

const expense = z
  .object({
    label: z.string().trim().min(1).max(100),
    /** Silver: a fixed amount. Percent: a share of the loot pool. Splits saved before kinds read as silver. */
    kind: z.enum(["silver", "percent"]).default("silver"),
    silver: silver.default(0),
    percent: tenthPercent.optional(),
  })
  .refine((row) => row.kind === "silver" || row.percent !== undefined, {
    message: "Enter the expense percentage",
    path: ["percent"],
  });

/** What comes off the pool before sharing: the guild tax and each expense, in whole silver. */
function deductions(input: {
  pool: number;
  guildTaxPercent: number;
  expenses: { kind: "silver" | "percent"; silver: number; percent?: number }[];
}) {
  const pool = BigInt(input.pool);
  const guildTax = cut(pool, input.guildTaxPercent);
  const rows = input.expenses.map((row) =>
    row.kind === "percent" ? cut(pool, row.percent ?? 0) : BigInt(row.silver),
  );
  return { pool, guildTax, rows, total: guildTax + rows.reduce((t, r) => t + r, 0n) };
}

export const lootConfiguration = z
  .object({
    pool: silver,
    notes: z.string().trim().max(2000),
    /** The team's guild tax rate applied to this split (0 = off), kept as it was when saved. */
    guildTaxPercent: tenthPercent.default(0),
    expenses: z.array(expense).max(50),
    participants: z
      .array(
        z.object({ userId: z.string().min(1).max(100), shares: z.number().int().min(1).max(1000) }),
      )
      .min(1)
      .max(400)
      .refine(
        (rows) => new Set(rows.map((row) => row.userId)).size === rows.length,
        "Choose each participant once",
      ),
  })
  .superRefine((input, ctx) => {
    const taken = deductions(input);
    if (taken.total > taken.pool)
      ctx.addIssue({
        code: "custom",
        message: input.guildTaxPercent
          ? "Guild tax and expenses cannot exceed the loot pool"
          : "Expenses cannot exceed the loot pool",
        path: ["expenses"],
      });
  });
export type LootConfiguration = z.input<typeof lootConfiguration>;
export type LootExpense = z.input<typeof expense>;
export const lootSave = z
  .object({
    id: z.string().min(1).max(100).optional(),
    version: z.number().int().positive().optional(),
    title: z.string().trim().min(3).max(100),
    configuration: lootConfiguration,
  })
  .refine(
    (v) => !!v.id === (v.version !== undefined),
    "Existing splits require their current version",
  );

/** Manual whole-silver accounting. The guild tax and percentage expenses are whole silver rounded
 * down from the gross pool (pool × tenths of a percent ÷ 1000); silver expenses are as entered.
 * All come off first. Weighted payouts use exact integer division; remaining silver goes to the
 * largest fractional shares, ties by stable user ID. Guild tax + expenses + payouts always equal
 * the original pool.
 */
export function allocateLoot(value: unknown) {
  const input = lootConfiguration.parse(value);
  const taken = deductions(input);
  const expenses = taken.total - taken.guildTax;
  const net = taken.pool - taken.total;
  const shares = input.participants.reduce((total, row) => total + BigInt(row.shares), 0n);
  const rows = input.participants.map((row) => ({
    ...row,
    base: (net * BigInt(row.shares)) / shares,
    remainder: (net * BigInt(row.shares)) % shares,
    bonus: 0,
  }));
  const rounding = Number(net - rows.reduce((total, row) => total + row.base, 0n));
  const ordered = [...rows].sort((a, b) =>
    a.remainder > b.remainder
      ? -1
      : a.remainder < b.remainder
        ? 1
        : a.userId < b.userId
          ? -1
          : a.userId > b.userId
            ? 1
            : 0,
  );
  for (let i = 0; i < rounding; i++) ordered[i].bonus = 1;
  return {
    pool: input.pool,
    guildTaxPercent: input.guildTaxPercent,
    guildTax: Number(taken.guildTax),
    expenses: Number(expenses),
    expenseRows: input.expenses.map((row, i) => ({
      label: row.label,
      kind: row.kind,
      percent: row.kind === "percent" ? (row.percent ?? 0) : null,
      silver: Number(taken.rows[i]),
    })),
    net: Number(net),
    roundingSilver: rounding,
    unallocatedSilver: 0,
    payouts: rows.map((row) => ({
      userId: row.userId,
      shares: row.shares,
      baseSilver: Number(row.base),
      roundingSilver: row.bonus,
      silver: Number(row.base) + row.bonus,
    })),
  };
}
