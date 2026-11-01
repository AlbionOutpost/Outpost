import { z } from "zod";
import type { Region } from "./region-config";

/* Game-info parsing shared by the web app and the data worker's kill collector. No cache or
   database imports here: the data worker bundles this file directly. */
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
export const sourceEvent = z.object({
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
export const rankedEvent = sourceEvent.extend({
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
export function normalizeCombatEvents(raw: unknown, max = 20) {
  const events = z.array(sourceEvent).max(max).parse(raw);
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
  const events = z.array(rankedEvent).max(60).parse(raw);
  return normalizeCombatEvents(events, 60).map((event, i) => {
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

/** One bounded read of a game-info endpoint: ten seconds, one megabyte, no redirects. */
export async function readCombatJson(url: string): Promise<unknown> {
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

/* ---- The week's top kills ----------------------------------------------------------------
   Albion's own kill-fame ranking lags by days, so Outpost keeps its own: a collector reads the
   live event feed every minute (and the official weekly ranking as a backstop), keeps a
   shortlist of the highest-fame kills from the last seven days per server, and the top-kills
   endpoint prices each shortlisted victim's gear to show the three highest silver values.
   Kill fame follows the victim's gear, so it is a cheap, honest pre-filter before pricing. */

export const KILL_WINDOW_MS = 7 * 24 * 3600 * 1000;
export const SHORTLIST_SIZE = 40;
export type KillCandidate = { id: number; occurredAt: number; fame: number; raw: unknown };

/** Valid ranked events from one source page; malformed entries are skipped, not guessed. */
export function candidatesFrom(raw: unknown): KillCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 60).flatMap((entry) => {
    const parsed = rankedEvent.safeParse(entry);
    if (!parsed.success) return [];
    const occurredAt = Date.parse(parsed.data.TimeStamp);
    return Number.isFinite(occurredAt)
      ? [{ id: parsed.data.EventId, occurredAt, fame: parsed.data.TotalVictimKillFame, raw: entry }]
      : [];
  });
}

/** Keeps the highest-fame kills of the last seven days, one entry per event, newest data wins. */
export function mergeShortlist(
  current: KillCandidate[],
  incoming: KillCandidate[],
  now: number,
  keep = SHORTLIST_SIZE,
): KillCandidate[] {
  const byId = new Map<number, KillCandidate>();
  for (const kill of [...current, ...incoming])
    if (kill.occurredAt > now - KILL_WINDOW_MS && kill.occurredAt <= now + 300_000)
      byId.set(kill.id, kill);
  return [...byId.values()]
    .sort((a, b) => b.fame - a.fame || b.occurredAt - a.occurredAt)
    .slice(0, keep);
}

/** One collection pass for a server: the two newest feed pages plus the official weekly ranking. */
export async function fetchKillCandidates(
  region: Region,
  read: (url: string) => Promise<unknown> = readCombatJson,
): Promise<KillCandidate[]> {
  const host = combatHosts[region];
  const pages = await Promise.allSettled([
    read(`${host}/api/gameinfo/events?limit=51&offset=0`),
    read(`${host}/api/gameinfo/events?limit=51&offset=51`),
    read(`${host}/api/gameinfo/events/killfame?range=week&limit=10&offset=0`),
  ]);
  return pages.flatMap((page) => (page.status === "fulfilled" ? candidatesFrom(page.value) : []));
}
