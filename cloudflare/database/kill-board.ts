import { DurableObject } from "cloudflare:workers";
import {
  KILL_WINDOW_MS,
  SHORTLIST_SIZE,
  type KillCandidate,
} from "../../src/lib/albion/combat-source";

/**
 * One server's shortlist of the last seven days' highest-fame kills (public game data). The
 * data worker's cron trigger records every collection pass; the web app reads the shortlist and
 * prices it. Rows outside the window or below the top 40 by fame are deleted on every write.
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
  async record(candidates: { id: number; occurredAt: number; fame: number; raw: string }[]) {
    if (!Array.isArray(candidates) || candidates.length > 200) throw new Error("Invalid kills");
    const now = Date.now();
    this.ctx.storage.transactionSync(() => {
      for (const kill of candidates) {
        if (
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
      this.ctx.storage.sql.exec(
        "INSERT INTO meta (key, value) VALUES ('collected_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        new Date(now).toISOString(),
      );
    });
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
    const meta = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM meta WHERE key = 'collected_at'")
      .toArray()[0];
    return { kills, collectedAt: meta?.value ?? null };
  }
}
