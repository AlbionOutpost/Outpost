import type { KillCandidate } from "../../src/lib/albion/combat-source";
import type { Region } from "../../src/lib/albion/region-config";
import { databaseBinding } from "./web-driver";

/** Cloudflare runtime: the shortlist the data worker's cron trigger keeps (see kill-board.ts). */
export async function killShortlist(
  region: Region,
): Promise<{ kills: KillCandidate[]; collectedAt: string | null }> {
  return databaseBinding().topKills(region);
}
