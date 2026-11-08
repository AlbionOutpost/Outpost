import {
  fetchKillCandidates,
  mergeRecent,
  mergeShortlist,
  type FeedEvent,
  type KillCandidate,
  type RecentKills,
} from "./albion/combat-source";
import type { Region } from "./albion/region-config";
import { rateLimit } from "./redis";

/* Node runtime: the shortlist and the window of newest fights live in this process and are
   refreshed at most once a minute when someone asks for them. On Cloudflare this module is
   replaced by cloudflare/database/kill-board-web.ts, which reads the data worker's KillBoard
   (filled by its cron trigger). */
type Board = {
  kills: KillCandidate[];
  recent: FeedEvent[];
  collectedAt: number;
  readAt: number;
  newestAt: number | null;
  pending?: Promise<void>;
};
const boards = new Map<Region, Board>();

async function board(region: Region): Promise<Board> {
  const board = boards.get(region) ?? {
    kills: [],
    recent: [],
    collectedAt: 0,
    readAt: 0,
    newestAt: null,
  };
  boards.set(region, board);
  if (Date.now() - board.collectedAt > 60_000 && !board.pending) {
    board.pending = (async () => {
      try {
        if (!(await rateLimit(`combat-upstream:${region}`, 12, 60))) return;
        const { candidates, recent } = await fetchKillCandidates(region);
        const now = Date.now();
        const newest = Math.max(
          board.newestAt ?? 0,
          ...candidates.map((kill) => kill.occurredAt),
          ...recent.map((event) => Date.parse(event.occurredAt)),
        );
        if (newest > 0 && newest <= now + 300_000) board.newestAt = newest;
        board.kills = mergeShortlist(board.kills, candidates, now);
        if (recent.length) {
          board.recent = mergeRecent(board.recent, recent, now);
          board.readAt = now;
        }
        board.collectedAt = now;
      } catch {
        // Keep the last shortlist; an unreachable source never empties it.
      } finally {
        board.pending = undefined;
      }
    })();
  }
  if (!board.collectedAt && board.pending) await board.pending;
  return board;
}

export async function killShortlist(
  region: Region,
): Promise<{ kills: KillCandidate[]; collectedAt: string | null }> {
  const { kills, collectedAt } = await board(region);
  return {
    kills: mergeShortlist(kills, [], Date.now()),
    collectedAt: collectedAt ? new Date(collectedAt).toISOString() : null,
  };
}

/** The newest distinct fights the collector has read, with its last read and newest kill. */
export async function recentKills(region: Region): Promise<RecentKills> {
  const { recent, readAt, newestAt } = await board(region);
  return { events: recent, readAt: readAt ? new Date(readAt).toISOString() : null, newestAt };
}
