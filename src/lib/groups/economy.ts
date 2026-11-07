import { z } from "zod";

/**
 * Team economy rules: the silver ledger, coin flips and loot rolls. Everything here is in-game
 * silver bookkeeping for a team; Outpost holds and moves no money and sells nothing.
 * Outcomes are drawn only on the server (`economy-service.ts`), inside the write transaction.
 */

/** One wallet entry or stake: whole silver, at most a trillion (far above any Albion haul). */
export const maxSilver = 1_000_000_000_000;
export const silverAmount = z.number().int().min(1).max(maxSilver);
const key = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid operation key");
const id = z.string().min(1).max(100);
const reason = z.string().trim().min(1).max(200);
/** A wallet: a member (their user id) or the team pot. */
const target = z.union([z.literal("pot"), id]);

export const walletAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.enum(["credit", "debit"]),
      key,
      target,
      amount: silverAmount,
      reason,
    })
    .strict(),
  /** Records silver handed over in game: takes the amount (default all of it) off the balance. */
  z
    .object({
      action: z.literal("payout"),
      key,
      target,
      amount: silverAmount.optional(),
      reason: reason.optional(),
    })
    .strict(),
  /** Sets a balance back to zero with one entry for the difference. */
  z.object({ action: z.literal("reset"), key, target, reason: reason.optional() }).strict(),
  /** Books a saved loot split's payouts into the participants' wallets, once per split. */
  z.object({ action: z.literal("pay-split"), splitId: id }).strict(),
]);
export type WalletAction = z.infer<typeof walletAction>;

export const gameAction = z.discriminatedUnion("action", [
  /** Two members, heads and tails; with a stake the other member must accept first. */
  z
    .object({
      action: z.literal("flip"),
      key,
      headsId: id,
      tailsId: id,
      stake: z.number().int().min(0).max(maxSilver).default(0),
    })
    .strict()
    .refine((v) => v.headsId !== v.tailsId, "Choose two different members"),
  /** One member calls a side. */
  z.object({ action: z.literal("call"), key, call: z.enum(["heads", "tails"]) }).strict(),
  z.object({ action: z.enum(["flip-accept", "flip-decline", "flip-cancel"]), flipId: id }).strict(),
  z
    .object({
      action: z.literal("roll-open"),
      key,
      title: z.string().trim().min(1).max(100),
      silver: z.number().int().min(0).max(maxSilver).default(0),
      potShare: z.boolean().default(false),
    })
    .strict(),
  z.object({ action: z.enum(["roll", "roll-close", "roll-cancel"]), rollId: id }).strict(),
]);
export type GameAction = z.infer<typeof gameAction>;

/** A pending staked flip lapses after a day; the stake never moves without both members. */
export const flipAcceptWindowMs = 24 * 60 * 60 * 1000;

/** Balances from ledger rows: the pot under `null`, members under their id. */
export function balancesFrom(rows: readonly { userId: string | null; amount: number }[]) {
  const map = new Map<string | null, number>();
  for (const row of rows) map.set(row.userId, (map.get(row.userId) ?? 0) + row.amount);
  return map;
}

/**
 * Uniform whole number in [min, max] from a byte source, by rejection sampling so no value is
 * favoured (a plain modulo would skew 1–100 towards the low numbers).
 */
export function uniformInt(
  min: number,
  max: number,
  bytes: (n: Uint32Array) => Uint32Array = (n) => crypto.getRandomValues(n),
) {
  const range = max - min + 1;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const buffer = new Uint32Array(1);
  for (;;) {
    const value = bytes(buffer)[0];
    if (value < limit) return min + (value % range);
  }
}
export const rollValue = (bytes?: (n: Uint32Array) => Uint32Array) => uniformInt(1, 100, bytes);
export const flipSide = (bytes?: (n: Uint32Array) => Uint32Array) =>
  uniformInt(0, 1, bytes) === 0 ? ("heads" as const) : ("tails" as const);

/** Who won a settled flip: the member on the landed side, or the caller if their call landed. */
export function flipWinner(flip: {
  headsId: string;
  tailsId: string | null;
  call: string | null;
  outcome: string | null;
}) {
  if (!flip.outcome) return null;
  if (flip.tailsId) return flip.outcome === "heads" ? flip.headsId : flip.tailsId;
  return flip.call === flip.outcome ? flip.headsId : null;
}

/**
 * The winner of a closed roll: the highest value. A tie at the top goes to a server draw among
 * the tied members (`pick` returns an index); two tied members settle it with a coin flip.
 */
export function rollWinner(
  entries: readonly { userId: string; value: number }[],
  pick: (count: number) => number,
) {
  if (!entries.length) return { winnerId: null, tied: [] as string[] };
  const top = Math.max(...entries.map((e) => e.value));
  const tied = entries
    .filter((e) => e.value === top)
    .map((e) => e.userId)
    .sort();
  return { winnerId: tied.length === 1 ? tied[0] : tied[pick(tied.length)], tied };
}

/**
 * Even shares of a roll's silver among everyone who rolled, plus one for the pot when asked.
 * Whole silver: leftover silver goes one each to members in id order, never to the pot, so the
 * shares always add up to the silver.
 */
export function rollShares(silver: number, rollers: readonly string[], potShare: boolean) {
  const ids = [...rollers].sort();
  const count = ids.length + (potShare ? 1 : 0);
  if (!silver || !count) return [] as { userId: string | null; silver: number }[];
  const base = Math.floor(silver / count);
  let left = silver - base * count;
  const rows: { userId: string | null; silver: number }[] = ids.map((userId) => ({
    userId,
    silver: base + (left-- > 0 ? 1 : 0),
  }));
  if (potShare) rows.push({ userId: null, silver: base });
  return rows.filter((row) => row.silver > 0);
}
