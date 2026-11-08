import type { KillCandidate, RecentKills } from "../../src/lib/albion/combat-source";
import type { Region } from "../../src/lib/albion/region-config";
import { databaseBinding } from "./web-driver";

/** Cloudflare runtime: the shortlist the data worker's cron trigger keeps (see kill-board.ts). */
export async function killShortlist(
  region: Region,
): Promise<{ kills: KillCandidate[]; collectedAt: string | null }> {
  return databaseBinding().topKills(region);
}

/** The newest distinct fights the cron collector has read, with its last read and newest kill. */
export async function recentKills(region: Region): Promise<RecentKills> {
  return databaseBinding().recentKills(region);
}
