import { z } from "zod";
import { regionSchema, type Region } from "./region-config";
import { killShortlist, recentKills } from "../kill-board";
import {
  KILL_WINDOW_MS,
  combatHosts,
  feedEventsFrom,
  feedFreshness,
  mergeFeedEvents,
  newestKillAt,
  normalizeTopKills,
  readCombatJson,
  shouldRetry,
  type FeedEvent,
  type FeedFreshness,
  type RecentKills,
  type TopKill,
} from "./combat-source";
export {
  combatHosts,
  normalizeCombatEvents,
  normalizeTopKills,
  type CombatEvent,
  type FeedEvent,
  type TopKill,
} from "./combat-source";
import { redis, rateLimit } from "../redis";
import { inflightCache } from "../inflight-cache";

export type CombatFeed = {
  region: Region;
  events: FeedEvent[];
  fetchedAt: string;
  source: string;
  offset: number;
  /** Newest kill on this page, as the source dated it. */
  newestAt: string | null;
  /** Newest kill Outpost has seen from this server, when known. */
  latestSeenAt: string | null;
  freshness: FeedFreshness;
  /** When Outpost's collector last read this server's newest fights from the source, if ever. */
  collectedAt: string | null;
  /** "collector": the page came from the collector's window of newest fights; "source": a live
   * read (on the first page merged with that window). */
  origin: "collector" | "source";
  /** The live read failed, so this page is the collector's copy; each fight keeps its own time. */
  sourceUnavailable: boolean;
};
const PAGE = 20;
/** A window the collector filled within this long is current enough to serve from. */
const WINDOW_FRESH_MS = 5 * 60_000;
const iso = (at: number | null) => (at === null ? null : new Date(at).toISOString());
type Saved = Omit<CombatFeed, "newestAt" | "latestSeenAt" | "freshness" | "region" | "offset"> & {
  seen: number | null;
};
/** Recomputed on every read, so a cached page grows "delayed" honestly as it ages. */
function toFeed(region: Region, offset: number, saved: Saved): CombatFeed {
  const { seen, ...rest } = saved;
  const newest = newestKillAt(saved.events);
  const latest = seen !== null && (newest === null || seen > newest) ? seen : newest;
  return {
    ...rest,
    region,
    offset,
    newestAt: iso(newest),
    latestSeenAt: iso(latest),
    freshness: feedFreshness(newest, seen, Date.now(), offset === 0),
  };
}
const local = new Map<string, { expires: number; feed: CombatFeed }>();

/**
 * A page of a server's published fights. Pages the collector's rolling window covers (the newest
 * ~100 distinct fights, merged across its every-minute reads) are served from it, so a lagging
 * Game Info replica cannot make the feed look old. Otherwise the page is read live: an answer
 * more than five minutes behind the newest kill seen is asked for once more and the two answers
 * are merged by EventId, and the first page is topped up with the window. When that live read
 * fails, whatever the window holds for the page is served and marked as such.
 */
export async function getCombatEvents(region: Region, offset: number): Promise<CombatFeed> {
  regionSchema.parse(region);
  z.number().int().min(0).max(200).multipleOf(PAGE).parse(offset);
  const key = `${region}:${offset}`;
  const hit = local.get(key);
  if (hit && hit.expires > Date.now()) return hit.feed;
  const pending = inflightCache("combat-events");
  const ongoing = pending.get(key);
  if (ongoing) return ongoing as Promise<CombatFeed>;
  const load = (async () => {
    const cache = redis();
    if (cache) {
      try {
        const saved = await cache.get(`atlas:combat:${key}`);
        if (saved && saved.length < 1_000_000) {
          const parsed = JSON.parse(saved) as Saved;
          if (
            Array.isArray(parsed.events) &&
            Number.isFinite(Date.parse(parsed.fetchedAt)) &&
            Date.now() - Date.parse(parsed.fetchedAt) < 45000 &&
            Date.parse(parsed.fetchedAt) <= Date.now()
          )
            return toFeed(region, offset, parsed);
        }
      } catch {}
    }
    const window: RecentKills = await recentKills(region).catch(() => ({
      events: [],
      readAt: null,
      newestAt: null,
    }));
    const covered = window.events.slice(offset, offset + PAGE);
    const current =
      window.readAt !== null && Date.now() - Date.parse(window.readAt) < WINDOW_FRESH_MS;
    let seen = window.newestAt;
    const saved: Saved = {
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Game Info",
      events: covered,
      collectedAt: window.readAt,
      origin: "collector",
      sourceUnavailable: false,
      seen,
    };
    if (!current || covered.length < PAGE) {
      try {
        const read = async () => {
          if (!(await rateLimit(`combat-upstream:${region}`, 12, 60)))
            throw new Error("Combat source request budget reached");
          return feedEventsFrom(
            await readCombatJson(
              `${combatHosts[region]}/api/gameinfo/events?limit=${PAGE}&offset=${offset}`,
            ),
            PAGE,
          );
        };
        let page = await read();
        // A replica behind the newest kill already seen: ask once more and merge both answers.
        if (offset === 0 && shouldRetry(newestKillAt(page), seen)) {
          try {
            page = mergeFeedEvents(page, await read(), PAGE);
          } catch {}
        }
        if (offset === 0) page = mergeFeedEvents(page, window.events, PAGE);
        const newest = newestKillAt(page);
        if (newest !== null && newest <= Date.now() + 300_000 && newest > (seen ?? 0))
          seen = newest;
        Object.assign(saved, { events: page, origin: "source", seen });
      } catch (error) {
        // The live read failed: serve the collector's copy of this page, said as such.
        if (!covered.length) throw error;
        saved.sourceUnavailable = true;
      }
    }
    const feed = toFeed(region, offset, saved);
    // An old or partial copy is kept only briefly, so the next visitor asks again.
    const seconds = feed.freshness === "snapshot" || saved.sourceUnavailable ? 10 : 45;
    for (const [oldKey, entry] of local) if (entry.expires < Date.now()) local.delete(oldKey);
    if (local.size >= 33) local.delete(local.keys().next().value!);
    local.set(key, { expires: Date.now() + seconds * 1000, feed });
    if (cache) {
      try {
        await cache.set(`atlas:combat:${key}`, JSON.stringify(saved), "EX", seconds);
      } catch {}
    }
    return feed;
  })();
  pending.set(key, load);
  try {
    return await load;
  } finally {
    pending.delete(key);
  }
}

export type TopKillsFeed = {
  region: Region;
  events: TopKill[];
  fetchedAt: string;
  source: string;
  /** Oldest kill time the shortlist covers (seven days back). */
  since: string;
};
/**
 * The last seven days' highest-fame kills for a server, from Outpost's own shortlist (kept
 * fresh every minute by the collector; see combat-source.ts). Pricing and the final silver
 * ranking happen in the top-kills endpoint.
 */
export async function getTopKills(region: Region): Promise<TopKillsFeed> {
  regionSchema.parse(region);
  const { kills, collectedAt } = await killShortlist(region);
  return {
    region,
    events: normalizeTopKills(kills.map((kill) => kill.raw)),
    fetchedAt: collectedAt ?? new Date().toISOString(),
    source: "Albion Online Game Info",
    since: new Date(Date.now() - KILL_WINDOW_MS).toISOString(),
  };
}
