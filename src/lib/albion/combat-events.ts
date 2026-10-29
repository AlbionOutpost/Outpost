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
    const response = await fetch(
      `${combatHosts[region]}/api/gameinfo/events?limit=20&offset=${offset}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
        cache: "no-store",
      },
    );
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
    const data = z
      .array(sourceEvent)
      .max(20)
      .parse(JSON.parse(new TextDecoder().decode(buffer)));
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
