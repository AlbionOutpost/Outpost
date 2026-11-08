import { HttpError } from "./http-error";

/**
 * Per-account storage limits for the shared private store (one SQLite object, 10 GB). Generous
 * enough that no real player meets them; they stop one account from filling the store.
 * Shared by the local services and the private database Worker, so no runtime imports here.
 */
export const storageLimits = {
  /** Builds one account can keep. */
  builds: 500,
  /** Comps one account can keep, Team comps they created included. */
  compositions: 500,
  /** Revisions kept per build or comp; older ones are removed in the same save. */
  revisions: 50,
  /** What one account can save in a day, in KiB (50 MiB). */
  dailySaveKiB: 50 * 1024,
} as const;

/** The largest body each editor may send, which a copy is counted at. */
export const saveSizeLimit = { build: 65536, composition: 1048576 } as const;

export function tooManyBuilds() {
  return new HttpError(
    409,
    `You have ${storageLimits.builds} builds, the most one account can keep. Delete one you no longer need, then save again.`,
  );
}
export function tooManyCompositions() {
  return new HttpError(
    409,
    `You have created ${storageLimits.compositions} comps, the most one account can keep (Team comps you made count too). Delete one you no longer need, then save again.`,
  );
}
export const dailySaveLimitMessage =
  "You have saved 50 MiB today, the daily limit for one account. Your changes are still in the editor; saving opens again within 24 hours.";

/** Bytes of a value as it is stored (UTF-8 JSON). */
export const storedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length;

/** The newest revision number that is no longer kept once `latest` is saved. */
export const lastDroppedRevision = (latest: number) => latest - storageLimits.revisions;
