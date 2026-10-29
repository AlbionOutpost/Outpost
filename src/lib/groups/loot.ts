import { z } from "zod";

const silver = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const lootConfiguration = z
  .object({
    pool: silver,
    notes: z.string().trim().max(2000),
    expenses: z.array(z.object({ label: z.string().trim().min(1).max(100), silver })).max(50),
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
    if (input.expenses.reduce((total, row) => total + BigInt(row.silver), 0n) > BigInt(input.pool))
      ctx.addIssue({
        code: "custom",
        message: "Expenses cannot exceed the loot pool",
        path: ["expenses"],
      });
  });
export type LootConfiguration = z.infer<typeof lootConfiguration>;
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

/** Manual whole-silver accounting. Expenses are deducted first. Weighted payouts
 * use exact integer division; remaining silver goes to largest fractional shares,
 * ties by stable user ID. Expenses + payouts always equal the original pool.
 */
export function allocateLoot(value: unknown) {
  const input = lootConfiguration.parse(value);
  const expenses = input.expenses.reduce((total, row) => total + BigInt(row.silver), 0n);
  const net = BigInt(input.pool) - expenses;
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
    expenses: Number(expenses),
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
