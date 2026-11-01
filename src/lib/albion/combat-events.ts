import { z } from "zod";
import { regionSchema, type Region } from "./region-config";
import { killShortlist } from "../kill-board";
import {
  KILL_WINDOW_MS,
  combatHosts,
  normalizeCombatEvents,
  normalizeTopKills,
  readCombatJson,
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
};
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
          const parsed = JSON.parse(saved) as { fetchedAt: string; data: unknown };
          if (
            Number.isFinite(Date.parse(parsed.fetchedAt)) &&
            Date.now() - Date.parse(parsed.fetchedAt) < 45000 &&
            Date.parse(parsed.fetchedAt) <= Date.now()
          )
            return {
              region,
              offset,
              source: "Albion Online Game Info",
              fetchedAt: parsed.fetchedAt,
              events: normalizeCombatEvents(parsed.data),
            };
        }
      } catch {}
    }
    if (!(await rateLimit(`combat-upstream:${region}`, 12, 60)))
      throw new Error("Combat source request budget reached");
    const data = z
      .array(sourceEvent)
      .max(20)
      .parse(
        await readCombatJson(
          `${combatHosts[region]}/api/gameinfo/events?limit=20&offset=${offset}`,
        ),
      );
    const events = normalizeCombatEvents(data);
    const feed = {
      region,
      offset,
      events,
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Game Info",
    };
    for (const [oldKey, entry] of local) if (entry.expires < Date.now()) local.delete(oldKey);
    if (local.size >= 33) local.delete(local.keys().next().value!);
    local.set(key, { expires: Date.now() + 45000, feed });
    if (cache) {
      try {
        await cache.set(
          `atlas:combat:${key}`,
          JSON.stringify({ fetchedAt: feed.fetchedAt, data }),
          "EX",
          45,
        );
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
