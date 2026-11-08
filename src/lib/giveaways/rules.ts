import { z } from "zod";
import { uniformInt } from "../groups/economy";
import { giveawayImages, maxWinners } from "./display";
export { giveawayImages, maxWinners } from "./display";

/**
 * Giveaway rules. Outpost staff run site-wide giveaways; a Team runs its own for its members.
 * Prizes are handed over in game by whoever runs the giveaway: Outpost sells nothing, takes no
 * payment and holds no prize. Winners are drawn only on the server (`service.ts`), once, inside
 * the write transaction, after entries close.
 */

/** Entries close at least five minutes and at most half a year after the change is saved. */
export const minLeadMs = 5 * 60_000;
export const maxLeadMs = 183 * 86_400_000;

const id = z.string().min(1).max(100);
const fields = {
  title: z.string().trim().min(3).max(100),
  prize: z.string().trim().min(1).max(500),
  image: z.enum(giveawayImages).nullable().default(null),
  region: z.enum(["europe", "americas", "asia"]),
  rules: z.string().trim().max(4000).default(""),
  winnerCount: z.number().int().min(1).max(maxWinners),
  closesAt: z.iso.datetime({ offset: true }),
};

/**
 * Every change a player can ask for. Strict: a request can never carry a winner, an outcome, a
 * status, a team or a time of draw; the server decides all of them.
 */
export const giveawayAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...fields }).strict(),
  z
    .object({ action: z.literal("update"), id, version: z.number().int().min(1), ...fields })
    .strict(),
  z.object({ action: z.enum(["cancel", "draw", "enter", "leave"]), id }).strict(),
]);
export type GiveawayAction = z.infer<typeof giveawayAction>;

/** Why a requested deadline is refused (too soon, too far away or not a time), or null. */
export function deadlineError(closesAt: string, now = Date.now()) {
  const time = new Date(closesAt).getTime();
  if (!Number.isFinite(time)) return "Choose when entries close.";
  if (time < now + minLeadMs) return "Entries must stay open for at least five minutes.";
  if (time > now + maxLeadMs) return "Entries can stay open for at most six months.";
  return null;
}

/**
 * Draws `count` different winners from `pool`, each place uniform over everyone not yet drawn
 * (a partial Fisher–Yates shuffle). `pick(min, max)` returns a whole number in [min, max]; it
 * defaults to crypto randomness with rejection sampling, so no entrant is favoured. The pool is
 * read in the order given; sort it first so the result depends on the randomness alone.
 */
export function drawWinners<T>(
  pool: readonly T[],
  count: number,
  pick: (min: number, max: number) => number = (min, max) => uniformInt(min, max),
) {
  const deck = [...pool];
  const take = Math.max(0, Math.min(Math.floor(count), deck.length));
  for (let i = 0; i < take; i++) {
    const j = pick(i, deck.length - 1);
    if (!Number.isInteger(j) || j < i || j >= deck.length) throw new Error("Draw out of range");
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, take);
}
