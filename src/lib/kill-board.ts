import { fetchKillCandidates, mergeShortlist, type KillCandidate } from "./albion/combat-source";
import type { Region } from "./albion/region-config";
import { rateLimit } from "./redis";

/* Node runtime: the shortlist lives in this process and is refreshed at most once a minute when
   someone asks for it. On Cloudflare this module is replaced by cloudflare/database/
   kill-board-web.ts, which reads the data worker's KillBoard (filled by its cron trigger). */
const boards = new Map<
  Region,
  { kills: KillCandidate[]; collectedAt: number; pending?: Promise<void> }
>();

export async function killShortlist(
  region: Region,
): Promise<{ kills: KillCandidate[]; collectedAt: string | null }> {
  const board = boards.get(region) ?? { kills: [], collectedAt: 0 };
  boards.set(region, board);
  if (Date.now() - board.collectedAt > 60_000 && !board.pending) {
    board.pending = (async () => {
      try {
        if (!(await rateLimit(`combat-upstream:${region}`, 12, 60))) return;
        const incoming = await fetchKillCandidates(region);
        board.kills = mergeShortlist(board.kills, incoming, Date.now());
        board.collectedAt = Date.now();
      } catch {
        // Keep the last shortlist; an unreachable source never empties it.
      } finally {
        board.pending = undefined;
      }
    })();
  }
  if (!board.kills.length && board.pending) await board.pending;
  return {
    kills: mergeShortlist(board.kills, [], Date.now()),
    collectedAt: board.collectedAt ? new Date(board.collectedAt).toISOString() : null,
  };
}
