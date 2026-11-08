import { DurableObject } from "cloudflare:workers";
import {
  KILL_WINDOW_MS,
  SHORTLIST_SIZE,
  mergeRecent,
  type FeedEvent,
  type KillCandidate,
  type RecentKills,
} from "../../src/lib/albion/combat-source";
const meta = (key: string) => `SELECT value FROM meta WHERE key = '${key}'`;
const setMeta =
  "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
/** Shape checks on what the collector hands over: our own worker, but stored and served. */
const validRecent = (event: unknown): event is FeedEvent => {
  const e = event as FeedEvent;
  return (
    typeof e === "object" &&
    e !== null &&
    Number.isSafeInteger(e.id) &&
    typeof e.occurredAt === "string" &&
    Number.isFinite(Date.parse(e.occurredAt)) &&
    typeof e.killer?.name === "string" &&
    typeof e.victim?.name === "string" &&
    Array.isArray(e.killer.equipment) &&
    Array.isArray(e.victim.equipment) &&
    (e.inventory === undefined || Array.isArray(e.inventory)) &&
    (e.crew === undefined || Array.isArray(e.crew))
  );
};

/**
 * One server's shortlist of the last seven days' highest-fame kills (public game data). The
 * data worker's cron trigger records every collection pass; the web app reads the shortlist and
 * prices it. Rows outside the window or below the top 40 by fame are deleted on every write, and
 * a kill below the current 40th fame is not written at all. It also keeps the newest kill time
 * seen and a rolling window of the newest ~100 distinct fights (one value, rewritten once a pass),
 * which the live feed serves its first pages from and compares each live answer against.
 */
export class KillBoard extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS kills (
         id INTEGER PRIMARY KEY,
         occurred_at INTEGER NOT NULL,
         fame INTEGER NOT NULL,
         raw TEXT NOT NULL
       );
       CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
    );
  }
  async record(
    candidates: { id: number; occurredAt: number; fame: number; raw: string }[],
    recent: FeedEvent[] = [],
  ) {
    if (!Array.isArray(candidates) || candidates.length > 200) throw new Error("Invalid kills");
    if (!Array.isArray(recent) || recent.length > 200) throw new Error("Invalid recent kills");
    const now = Date.now();
    let newest = this.#newest() ?? 0;
    // A kill below the 40th-highest fame would be deleted again at once: skip the write.
    const floor =
      this.ctx.storage.sql
        .exec<{ fame: number }>(
          "SELECT fame FROM kills ORDER BY fame DESC, occurred_at DESC LIMIT 1 OFFSET ?",
          SHORTLIST_SIZE - 1,
        )
        .toArray()[0]?.fame ?? 0;
    const fresh = recent.filter(validRecent);
    for (const event of fresh)
      if (Date.parse(event.occurredAt) <= now + 300_000)
        newest = Math.max(newest, Date.parse(event.occurredAt));
    this.ctx.storage.transactionSync(() => {
      for (const kill of candidates) {
        if (Number.isFinite(kill.occurredAt) && kill.occurredAt <= now + 300_000)
          newest = Math.max(newest, kill.occurredAt);
        if (
          kill.fame < floor ||
          !Number.isSafeInteger(kill.id) ||
          !Number.isFinite(kill.occurredAt) ||
          !Number.isSafeInteger(kill.fame) ||
          typeof kill.raw !== "string" ||
          kill.raw.length > 200_000 ||
          kill.occurredAt <= now - KILL_WINDOW_MS ||
          kill.occurredAt > now + 300_000
        )
          continue;
        this.ctx.storage.sql.exec(
          `INSERT INTO kills (id, occurred_at, fame, raw) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET fame = excluded.fame, raw = excluded.raw`,
          kill.id,
          kill.occurredAt,
          kill.fame,
          kill.raw,
        );
      }
      this.ctx.storage.sql.exec("DELETE FROM kills WHERE occurred_at <= ?", now - KILL_WINDOW_MS);
      this.ctx.storage.sql.exec(
        `DELETE FROM kills WHERE id NOT IN (
           SELECT id FROM kills ORDER BY fame DESC, occurred_at DESC LIMIT ?
         )`,
        SHORTLIST_SIZE,
      );
      this.ctx.storage.sql.exec(setMeta, "collected_at", new Date(now).toISOString());
      if (newest) this.ctx.storage.sql.exec(setMeta, "newest_at", String(newest));
      if (fresh.length)
        this.ctx.storage.sql.exec(
          setMeta,
          "recent",
          JSON.stringify({
            readAt: new Date(now).toISOString(),
            events: mergeRecent(this.#recent().events, fresh, now),
          }),
        );
    });
  }
  #recent(): { events: FeedEvent[]; readAt: string | null } {
    const row = this.ctx.storage.sql.exec<{ value: string }>(meta("recent")).toArray()[0];
    if (!row) return { events: [], readAt: null };
    try {
      const saved = JSON.parse(row.value) as { events: FeedEvent[]; readAt: string };
      return { events: saved.events.filter(validRecent), readAt: saved.readAt };
    } catch {
      return { events: [], readAt: null };
    }
  }
  /** The newest distinct fights the collector has read, newest first, with when it last read. */
  async recent(): Promise<RecentKills> {
    return { ...this.#recent(), newestAt: this.#newest() };
  }
  #newest(): number | null {
    const row = this.ctx.storage.sql.exec<{ value: string }>(meta("newest_at")).toArray()[0];
    const value = Number(row?.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  async shortlist(): Promise<{ kills: KillCandidate[]; collectedAt: string | null }> {
    const since = Date.now() - KILL_WINDOW_MS;
    const kills = this.ctx.storage.sql
      .exec<{ id: number; occurred_at: number; fame: number; raw: string }>(
        "SELECT id, occurred_at, fame, raw FROM kills WHERE occurred_at > ? ORDER BY fame DESC, occurred_at DESC LIMIT ?",
        since,
        SHORTLIST_SIZE,
      )
      .toArray()
      .map((row) => ({
        id: row.id,
        occurredAt: row.occurred_at,
        fame: row.fame,
        raw: JSON.parse(row.raw) as unknown,
      }));
    const collected = this.ctx.storage.sql
      .exec<{ value: string }>(meta("collected_at"))
      .toArray()[0];
    return { kills, collectedAt: collected?.value ?? null };
  }
}
