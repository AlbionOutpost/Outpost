import { z } from "zod";
import { regionSchema, type Region } from "./region-config";
import { redis, rateLimit } from "../redis";
import { inflightCache } from "../inflight-cache";

export const combatHosts: Record<Region, string> = {
  americas: "https://gameinfo.albiononline.com",
  europe: "https://gameinfo-ams.albiononline.com",
  asia: "https://gameinfo-sgp.albiononline.com",
};
const safeCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const equipment = z.object({
  Type: z.string().regex(/^[A-Z0-9_@]{2,120}$/),
  Quality: z.number().int().min(0).max(5).optional(),
  Count: safeCount.optional(),
});
const person = z.object({
  Id: z.string().min(1).max(100),
  Name: z.string().min(1).max(100),
  GuildName: z.string().max(150).nullable().optional(),
  AllianceName: z.string().max(150).nullable().optional(),
  AverageItemPower: z.number().nonnegative().max(100000).optional(),
  Equipment: z.record(z.string().max(40), equipment.nullable()).optional(),
});
const participant = person.extend({
  DamageDone: z.number().nonnegative().optional(),
  SupportHealingDone: z.number().nonnegative().optional(),
});
const sourceEvent = z.object({
  EventId: safeCount.positive(),
  TimeStamp: z
    .string()
    .max(60)
    .refine((v) => Number.isFinite(Date.parse(v))),
  Killer: person,
  Victim: person,
  TotalVictimKillFame: safeCount,
  numberOfParticipants: safeCount.optional(),
  BattleId: safeCount.nullable().optional(),
});
// Only the ranking reads inventories and participants; the feed strips both.
const rankedEvent = sourceEvent.extend({
  Victim: person.extend({ Inventory: z.array(equipment.nullable()).max(200).optional() }),
  Participants: z.array(participant).max(100).optional(),
});
const slots = [
  ["MainHand", "Main hand"],
  ["Head", "Helmet"],
  ["Armor", "Chest"],
  ["Shoes", "Boots"],
  ["OffHand", "Off hand"],
  ["Cape", "Cape"],
  ["Bag", "Bag"],
  ["Food", "Food"],
  ["Potion", "Potion"],
  ["Mount", "Mount"],
] as const;
export function normalizeCombatEvents(raw: unknown) {
  const events = z.array(sourceEvent).max(20).parse(raw);
  const identities = new Set<number>();
  const player = (p: z.infer<typeof person>) => ({
    id: p.Id,
    name: p.Name,
    guild: p.GuildName || "",
    alliance: p.AllianceName || "",
    itemPower: p.AverageItemPower ?? null,
    equipment: slots.map(([key, slot]) => {
      const item = p.Equipment?.[key];
      return {
        slot,
        itemId: item?.Type ?? null,
        quality: item?.Quality && item.Quality > 0 ? item.Quality : null,
      };
    }),
  });
  return events
    .filter((event) => {
      if (identities.has(event.EventId)) return false;
      identities.add(event.EventId);
      return true;
    })
    .map((event) => ({
      id: event.EventId,
      occurredAt: event.TimeStamp,
      killer: player(event.Killer),
      victim: player(event.Victim),
      fame: event.TotalVictimKillFame,
      participants: event.numberOfParticipants ?? null,
    }));
}
export type CombatEvent = ReturnType<typeof normalizeCombatEvents>[number];

/**
 * The game's highest-fame kills, with what the victim carried and who took part. The source
 * ranks by kill fame over its own window; the landing page says how old the kills are rather
 * than promising "today".
 */
export function normalizeTopKills(raw: unknown) {
  const events = z.array(rankedEvent).max(10).parse(raw);
  return normalizeCombatEvents(events).map((event, i) => {
    const source = events[i];
    return {
      ...event,
      inventory: (source.Victim.Inventory ?? []).flatMap((item) =>
        item ? [{ itemId: item.Type, count: item.Count ?? 1 }] : [],
      ),
      crew: (source.Participants ?? []).map((p) => ({
        name: p.Name,
        guild: p.GuildName || "",
        damage: Math.round(p.DamageDone ?? 0),
        healing: Math.round(p.SupportHealingDone ?? 0),
        itemPower: p.AverageItemPower ?? null,
        equipment: slots.flatMap(([key, slot]) => {
          const item = p.Equipment?.[key];
          return item ? [{ slot, itemId: item.Type }] : [];
        }),
      })),
    };
  });
}
export type TopKill = ReturnType<typeof normalizeTopKills>[number];
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

/** One bounded read of a game-info endpoint: ten seconds, one megabyte, no redirects. */
async function readCombatJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    redirect: "manual",
    cache: "no-store",
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Combat source unavailable");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty combat response");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1000000) {
      await reader.cancel();
      throw new Error("Combat response exceeds limit");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let position = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, position);
    position += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}

const topLocal = new Map<Region, { expires: number; feed: TopKillsFeed }>();
export type TopKillsFeed = { region: Region; events: TopKill[]; fetchedAt: string; source: string };
/** The source's kill-fame ranking, three entries, cached for five minutes per region. */
export async function getTopKills(region: Region): Promise<TopKillsFeed> {
  regionSchema.parse(region);
  const hit = topLocal.get(region);
  if (hit && hit.expires > Date.now()) return hit.feed;
  const pending = inflightCache("combat-top");
  const ongoing = pending.get(region);
  if (ongoing) return ongoing as Promise<TopKillsFeed>;
  const load = (async () => {
    const cache = redis();
    const cacheKey = `atlas:combat-top:v1:${region}`;
    if (cache) {
      try {
        const saved = await cache.get(cacheKey);
        if (saved && saved.length < 400000) {
          const parsed = JSON.parse(saved) as { fetchedAt: string; data: unknown };
          if (
            Number.isFinite(Date.parse(parsed.fetchedAt)) &&
            Date.now() - Date.parse(parsed.fetchedAt) < 300000
          )
            return {
              region,
              source: "Albion Online Game Info",
              fetchedAt: parsed.fetchedAt,
              events: normalizeTopKills(parsed.data),
            };
        }
      } catch {}
    }
    if (!(await rateLimit(`combat-upstream:${region}`, 12, 60)))
      throw new Error("Combat source request budget reached");
    const data = await readCombatJson(
      `${combatHosts[region]}/api/gameinfo/events/killfame?range=day&limit=3&offset=0`,
    );
    const feed: TopKillsFeed = {
      region,
      events: normalizeTopKills(data),
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Game Info",
    };
    topLocal.set(region, { expires: Date.now() + 300000, feed });
    if (cache) {
      try {
        await cache.set(cacheKey, JSON.stringify({ fetchedAt: feed.fetchedAt, data }), "EX", 300);
      } catch {}
    }
    return feed;
  })();
  pending.set(region, load);
  try {
    return await load;
  } finally {
    pending.delete(region);
  }
}
