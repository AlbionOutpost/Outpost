import { z } from "zod";

/** Library favorites an account keeps, as on a device. */
export const LIBRARY_FAVORITE_LIMIT = 100;
/** Spec rows an account keeps: the game has 369 specs; the bound leaves room for new ones. */
export const MASTERY_LEVEL_LIMIT = 400;

/** A library build's canonical key: its slug, or its id when the slug is over 200 characters. */
export const libraryFavoriteKey = z.string().regex(/^[a-z0-9][a-z0-9-]{0,199}$/);
export const masterySpecId = z.string().regex(/^[a-z0-9_]{1,80}$/);
/** Levels as a spec → 0–100 map; 0 means "not set" and is never stored. */
export const masteryLevelsInput = z
  .record(masterySpecId, z.number().int().min(0).max(100))
  .refine((levels) => Object.keys(levels).length <= MASTERY_LEVEL_LIMIT, "Too many specs");

export const accountSavesRequest = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("merge"),
      // A device keeps up to 100 per server; three servers can hold 300 between them.
      favorites: z.array(libraryFavoriteKey).max(LIBRARY_FAVORITE_LIMIT * 3),
      levels: masteryLevelsInput,
    })
    .strict(),
  z
    .object({ action: z.literal("favorite"), slug: libraryFavoriteKey, active: z.boolean() })
    .strict(),
  z.object({ action: z.literal("levels"), levels: masteryLevelsInput }).strict(),
]);
export type AccountSavesRequest = z.infer<typeof accountSavesRequest>;

/**
 * Favorites to add when a device copy is merged into the account: device keys the account does
 * not have yet, in device order, until the account reaches its limit. Merging the same copy
 * again adds nothing.
 */
export function favoritesToAdd(
  account: string[],
  device: string[],
  limit = LIBRARY_FAVORITE_LIMIT,
) {
  const have = new Set(account),
    add: string[] = [];
  for (const key of device) {
    if (have.size >= limit) break;
    if (have.has(key)) continue;
    have.add(key);
    add.push(key);
  }
  return add;
}

/**
 * Spec levels after merging a device copy: for each spec the higher of the two levels (in game a
 * spec only rises), so merging twice, or in either order, gives the same result. Zero levels drop.
 */
export function mergeMasteryLevels(
  account: Record<string, number>,
  device: Record<string, number>,
) {
  // No prototype: a spec key such as "constructor" must read as unset, not as Object's own.
  const merged: Record<string, number> = Object.create(null);
  for (const [id, level] of [...Object.entries(account), ...Object.entries(device)])
    if (level > 0) merged[id] = Math.max(merged[id] ?? 0, level);
  return { ...merged };
}
