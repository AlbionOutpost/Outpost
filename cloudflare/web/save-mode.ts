/* Emergency save mode (docs/OPERATIONS.md § Save mode). With the plain-text Worker variable
 * `OUTPOST_SAVE_MODE=1`, every signed-out page and API answer the edge cache keeps lives ten
 * times longer (capped at an hour), so more requests are answered from a cached copy instead of
 * a render: a 60 s page is kept 10 minutes, a 5 min reference page 50 minutes. The Cache API
 * cannot return an expired entry, so a longer life is how a "stale" copy keeps being served.
 * What is cached, and for whom, does not change: the allowlists and their checks still decide,
 * and a miss renders as normal. Every observation on a kept page still shows its own age. */

export const SAVE_MODE_FACTOR = 10;
export const SAVE_MODE_MAX_TTL = 3600;

/** True when the Worker variable is exactly "1" or "true". */
export function saveMode(env: object): boolean {
  const value = (env as { OUTPOST_SAVE_MODE?: unknown }).OUTPOST_SAVE_MODE;
  return value === "1" || value === "true";
}

/** The edge-cache lifetime (seconds) to store an answer with. */
export function edgeTtl(ttl: number, env: object): number {
  return saveMode(env) ? Math.max(ttl, Math.min(ttl * SAVE_MODE_FACTOR, SAVE_MODE_MAX_TTL)) : ttl;
}
