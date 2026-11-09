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
// The killboard reads what the victim carried and who took part; everything else is stripped.
// Big fights list hundreds of participants, so the bound is generous rather than a reason to
// drop the fight.
export const rankedEvent = sourceEvent.extend({
  Victim: person.extend({ Inventory: z.array(equipment.nullable()).max(200).optional() }),
  Participants: z.array(participant).max(1000).optional(),
});
type SourceEvent = z.infer<typeof sourceEvent>;
type RankedEvent = z.infer<typeof rankedEvent>;
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
const toEvent = (event: SourceEvent) => ({
  id: event.EventId,
  occurredAt: event.TimeStamp,
  killer: player(event.Killer),
  victim: player(event.Victim),
  fame: event.TotalVictimKillFame,
  participants: event.numberOfParticipants ?? null,
});
const toRanked = (event: RankedEvent) => ({
  ...toEvent(event),
  inventory: (event.Victim.Inventory ?? []).flatMap((item) =>
    item ? [{ itemId: item.Type, count: item.Count ?? 1 }] : [],
  ),
  crew: (event.Participants ?? []).map((p) => ({
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
});
/** One entry per EventId, first copy wins. */
function distinct<T extends { EventId: number }>(events: T[]) {
  const seen = new Set<number>();
  return events.filter((event) => !seen.has(event.EventId) && Boolean(seen.add(event.EventId)));
}
export function normalizeCombatEvents(raw: unknown, max = 20) {
  return distinct(z.array(sourceEvent).max(max).parse(raw)).map(toEvent);
}
export type CombatEvent = ReturnType<typeof normalizeCombatEvents>[number];

/**
 * The game's highest-fame kills, with what the victim carried and who took part. The source
 * ranks by kill fame over its own window; the landing page says how old the kills are rather
 * than promising "today".
 */
export function normalizeTopKills(raw: unknown) {
  return distinct(z.array(rankedEvent).max(60).parse(raw)).map(toRanked);
}
export type TopKill = ReturnType<typeof normalizeTopKills>[number];
/** A fight as the kill feed and the killboard show it: both loadouts and, when the source's
 * record of them parsed, what the victim carried and who took part. */
export type FeedEvent = CombatEvent & Partial<Pick<TopKill, "inventory" | "crew">>;

/**
 * A page of the live event feed as killboard events. An entry whose inventory or participants do
 * not parse keeps its fight without them (the card then leaves those parts out, never "nothing
 * carried"); an entry that is not a valid fight is skipped rather than failing the page. A body
 * that is not a bounded list throws.
 */
export function feedEventsFrom(raw: unknown, max = 60): FeedEvent[] {
  if (!Array.isArray(raw) || raw.length > max) throw new Error("Unexpected combat response");
  const seen = new Set<number>();
  return raw.flatMap((entry): FeedEvent[] => {
    const ranked = rankedEvent.safeParse(entry);
    const plain = ranked.success ? null : sourceEvent.safeParse(entry);
    const id = ranked.success ? ranked.data.EventId : plain?.success ? plain.data.EventId : null;
    if (id === null || seen.has(id)) return [];
    seen.add(id);
    return [ranked.success ? toRanked(ranked.data) : toEvent(plain!.data as SourceEvent)];
  });
}

/**
 * Game Info sends every participant's and group member's full kit with each fight, so a page
 * grows with the fights in it: 20 events from a large fight run to a few megabytes, and the
 * collector's 51-event pages more. A one-megabyte cap rejected those pages outright (8 Nov 2026:
 * the Americas feed failed on every call during big fights, and the collector's live pages were
 * dropped), so the cap is eight megabytes, decoded as it streams in.
 */
export const COMBAT_MAX_BYTES = 8_000_000;
/** One bounded read of a game-info endpoint: no redirects, a byte cap and a time limit. */
export async function readCombatJson(
  url: string,
  { timeoutMs = 10_000, maxBytes = COMBAT_MAX_BYTES } = {},
): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "manual",
    cache: "no-store",
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Combat source unavailable");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty combat response");
  const decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error("Combat response exceeds limit");
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

/* ---- Feed freshness -----------------------------------------------------------------------
   Game Info is served by several replicas that lag by different amounts: two calls seconds apart
   can answer with kills from 20:21 and from 19:56 (Europe, 8 Nov 2026), and a replica can answer
   with a copy days old. Outpost keeps the newest kill time it has seen per server, asks once more
   when an answer is behind it, merges the answers, and says on the page how old the newest kill is
   instead of presenting old fights as the latest. */

/** The game normally publishes fights minutes late; past an hour the page says so. */
export const SOURCE_DELAY_MS = 60 * 60_000;
/** A first page whose newest kill is further behind the newest kill Outpost saw is not live. */
export const LIVE_LAG_MS = 15 * 60_000;
/** An answer this far behind the newest kill Outpost saw is asked for once more. */
export const RETRY_LAG_MS = 5 * 60_000;
export type FeedFreshness = "live" | "delayed" | "snapshot";

/** Newest kill time in a page of events (epoch ms), or null for an empty or undated page. */
export function newestKillAt(events: { occurredAt: string }[]): number | null {
  const times = events.map((e) => Date.parse(e.occurredAt)).filter(Number.isFinite);
  return times.length ? Math.max(...times) : null;
}

/**
 * First page: "snapshot" when its newest kill is over 15 minutes behind a kill Outpost already
 * saw on the same server (an old copy), "delayed" when nothing newer is known but the newest kill
 * is over an hour old (the source is behind), otherwise "live". Deeper pages are older by nature:
 * only an answer over an hour behind a seen kill is flagged there.
 */
export function feedFreshness(
  newestAt: number | null,
  latestSeenAt: number | null,
  now: number,
  firstPage: boolean,
): FeedFreshness {
  if (newestAt === null) return "live";
  const behind = latestSeenAt === null ? 0 : latestSeenAt - newestAt;
  if (behind > (firstPage ? LIVE_LAG_MS : SOURCE_DELAY_MS)) return "snapshot";
  if (firstPage && now - newestAt > SOURCE_DELAY_MS) return "delayed";
  return "live";
}

/** Whether an answer is far enough behind the newest kill already seen to ask once more. */
export function shouldRetry(newestAt: number | null, latestSeenAt: number | null) {
  return latestSeenAt !== null && (newestAt === null || latestSeenAt - newestAt > RETRY_LAG_MS);
}

/** Newest first, ties by event id, so every merge orders the same fights the same way. */
const byTime = (a: { occurredAt: string; id: number }, b: { occurredAt: string; id: number }) =>
  Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id - a.id;

/**
 * Two answers for the same feed, merged: one entry per EventId (the first answer's copy), newest
 * first, at most `limit`. Every fight keeps its own timestamp; nothing is invented.
 */
export function mergeFeedEvents<T extends { id: number; occurredAt: string }>(
  first: T[],
  second: T[],
  limit: number,
): T[] {
  const byId = new Map<number, T>();
  for (const event of [...first, ...second]) if (!byId.has(event.id)) byId.set(event.id, event);
  return [...byId.values()].sort(byTime).slice(0, limit);
}

/* ---- The newest fights ----------------------------------------------------------------------
   The collector below reads each server's two newest feed pages every minute. Their fights are
   merged into a rolling window of the newest distinct events per server (one stored value,
   written once a tick), and the feed's first pages are served from it: a lagging replica can only
   add fights the window lacks, never push newer ones out. */

export const RECENT_SIZE = 100;
/** The rolling window of a server's newest fights, as the feed reads it. */
export type RecentKills = {
  events: FeedEvent[];
  /** When a collection pass last read a live feed page (ISO), or null. */
  readAt: string | null;
  /** The newest kill time any pass has seen (epoch ms), or null. */
  newestAt: number | null;
};
/** The stored window stays well under a Durable Object value's 2 MB. */
export const RECENT_MAX_CHARS = 1_500_000;

/** The newest `keep` distinct fights from the window and a new read, dropping the oldest until
 * the serialized window fits. Fights dated more than five minutes ahead are left out. */
export function mergeRecent(
  current: FeedEvent[],
  incoming: FeedEvent[],
  now: number,
  keep = RECENT_SIZE,
  maxChars = RECENT_MAX_CHARS,
): FeedEvent[] {
  const merged = mergeFeedEvents(incoming, current, Infinity).filter(
    (event) => Date.parse(event.occurredAt) <= now + 300_000,
  );
  const window = merged.slice(0, keep);
  let size = JSON.stringify(window).length;
  while (window.length && size > maxChars) size -= JSON.stringify(window.pop()).length + 1;
  return window;
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

/** Valid ranked events from one source page, stripped to what the killboard reads; malformed
 * entries are skipped, not guessed. */
export function candidatesFrom(raw: unknown): KillCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 60).flatMap((entry) => {
    const parsed = rankedEvent.safeParse(entry);
    if (!parsed.success) return [];
    const occurredAt = Date.parse(parsed.data.TimeStamp);
    return Number.isFinite(occurredAt)
      ? [
          {
            id: parsed.data.EventId,
            occurredAt,
            fame: parsed.data.TotalVictimKillFame,
            raw: parsed.data,
          },
        ]
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

/**
 * One collection pass for a server: the two newest feed pages, then the official weekly ranking,
 * one at a time so a large page is parsed and stripped before the next arrives. `recent` holds
 * the feed pages' fights (empty when neither page could be read); `candidates` everything valid.
 */
export async function fetchKillCandidates(
  region: Region,
  read: (url: string) => Promise<unknown> = (url) => readCombatJson(url, { timeoutMs: 20_000 }),
): Promise<{ candidates: KillCandidate[]; recent: FeedEvent[] }> {
  const host = combatHosts[region];
  const candidates: KillCandidate[] = [],
    recent: FeedEvent[] = [];
  for (const [url, live] of [
    [`${host}/api/gameinfo/events?limit=51&offset=0`, true],
    [`${host}/api/gameinfo/events?limit=51&offset=51`, true],
    [`${host}/api/gameinfo/events/killfame?range=week&limit=10&offset=0`, false],
  ] as const) {
    try {
      const page = await read(url);
      candidates.push(...candidatesFrom(page));
      if (live) recent.push(...feedEventsFrom(page));
    } catch {
      // That page is missing from this pass; the next pass asks again.
    }
  }
  return { candidates, recent };
}

/**
 * One cron pass over every server (the data Worker's `scheduled`). Servers run independently;
 * afterwards the pass fails, naming them, when any server's live feed was unreadable or its write
 * failed, so a stale kill feed shows as a failed cron run in Workers analytics and the health
 * check alerts (docs/OPERATIONS.md § Error alerts).
 */
export async function collectKillFeeds(
  regions: readonly Region[],
  record: (region: Region, candidates: KillCandidate[], recent: FeedEvent[]) => Promise<unknown>,
  fetch: (region: Region) => ReturnType<typeof fetchKillCandidates> = fetchKillCandidates,
) {
  const results = await Promise.allSettled(
    regions.map(async (region) => {
      const { candidates, recent } = await fetch(region);
      if (candidates.length) await record(region, candidates, recent);
      if (!recent.length) throw new Error("live kill feed unreadable");
    }),
  );
  const failed = regions.filter((_, index) => results[index].status === "rejected");
  if (failed.length) throw new Error(`Kill collector: no fresh kills from ${failed.join(", ")}`);
}
