import { z } from "zod";
import { regionSchema, type Region } from "./region-config";
import { killShortlist, killWatermark, noteNewestKill } from "../kill-board";
import {
  KILL_WINDOW_MS,
  combatHosts,
  feedFreshness,
  newestKillAt,
  normalizeCombatEvents,
  normalizeTopKills,
  readCombatJson,
  type FeedFreshness,
  sourceEvent,
  type CombatEvent,
  type TopKill,
} from "./combat-source";
export {
  combatHosts,
  normalizeCombatEvents,
  normalizeTopKills,
  type CombatEvent,
  type TopKill,
} from "./combat-source";
import { redis, rateLimit } from "../redis";
import { inflightCache } from "../inflight-cache";

export type CombatFeed = {
  region: Region;
  events: CombatEvent[];
  fetchedAt: string;
  source: string;
  offset: number;
  /** Newest kill on this page, as the source dated it. */
  newestAt: string | null;
  /** Newest kill Outpost has seen from this server, when known. */
  latestSeenAt: string | null;
  freshness: FeedFreshness;
};
const iso = (at: number | null) => (at === null ? null : new Date(at).toISOString());
type Saved = { fetchedAt: string; data: unknown; latestSeenAt?: number | null };
/** Recomputed on every read, so a cached page grows "delayed" honestly as it ages. */
function toFeed(region: Region, offset: number, saved: Saved): CombatFeed {
  const events = normalizeCombatEvents(saved.data);
  const newest = newestKillAt(events),
    seen = saved.latestSeenAt ?? null;
  const latest = seen !== null && (newest === null || seen > newest) ? seen : newest;
  return {
    region,
    offset,
    source: "Albion Online Game Info",
    fetchedAt: saved.fetchedAt,
    events,
    newestAt: iso(newest),
    latestSeenAt: iso(latest),
    freshness: feedFreshness(newest, seen, Date.now(), offset === 0),
  };
}
const local = new Map<string, { expires: number; feed: CombatFeed }>();
export async function getCombatEvents(region: Region, offset: number): Promise<CombatFeed> {
  regionSchema.parse(region);
  z.number().int().min(0).max(200).multipleOf(20).parse(offset);
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
        if (saved && saved.length < 200000) {
          const parsed = JSON.parse(saved) as Saved;
          if (
            Number.isFinite(Date.parse(parsed.fetchedAt)) &&
            Date.now() - Date.parse(parsed.fetchedAt) < 45000 &&
            Date.parse(parsed.fetchedAt) <= Date.now()
          )
            return toFeed(region, offset, parsed);
        }
      } catch {}
    }
    const read = async () => {
      if (!(await rateLimit(`combat-upstream:${region}`, 12, 60)))
        throw new Error("Combat source request budget reached");
      return z
        .array(sourceEvent)
        .max(20)
        .parse(
          await readCombatJson(
            `${combatHosts[region]}/api/gameinfo/events?limit=20&offset=${offset}`,
          ),
        );
    };
    let data = await read();
    const seen = await killWatermark(region).catch(() => null);
    const newestOf = (page: typeof data) =>
      newestKillAt(page.map((event) => ({ occurredAt: event.TimeStamp })));
    // An old copy of the feed: ask once more, keep whichever answer is newer.
    if (feedFreshness(newestOf(data), seen, Date.now(), false) === "snapshot") {
      try {
        const again = await read();
        if ((newestOf(again) ?? 0) > (newestOf(data) ?? 0)) data = again;
      } catch {}
    }
    noteNewestKill(region, newestOf(data));
    const saved: Saved = { fetchedAt: new Date().toISOString(), data, latestSeenAt: seen };
    const feed = toFeed(region, offset, saved);
    // An old copy is kept only briefly, so the next visitor asks the source again.
    const seconds = feed.freshness === "snapshot" ? 10 : 45;
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
