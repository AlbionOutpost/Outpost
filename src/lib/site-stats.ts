import { db, databaseService } from "./db";

/**
 * Public counts shown on the landing page. Only what is measured: accounts come from the
 * account table; there is no supporter count until a premium plan exists.
 */
async function localCountPlayers(): Promise<number> {
  return db.user.count();
}
export const countPlayers: typeof localCountPlayers = (...args) =>
  databaseService<number>("countPlayers", args) ?? localCountPlayers(...args);

let cached: { value: number; expires: number } | null = null;
/** The count changes slowly; one database request per process every ten minutes is plenty. */
export async function playerCount(): Promise<number | null> {
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const value = await countPlayers();
    cached = { value, expires: Date.now() + 600_000 };
    return value;
  } catch {
    return cached?.value ?? null;
  }
}
