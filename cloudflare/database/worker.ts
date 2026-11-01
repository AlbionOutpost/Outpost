import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import { storageClient, catalogClient } from "./create-client.mjs";
import { databaseContext } from "./context";
import { executeService } from "./services";
import {
  databaseFailure,
  publicModels,
  sqliteArgs,
  validateQuery,
  type DatabaseQuery,
  type DatabaseReply,
} from "./protocol";
import { HttpError } from "../../src/lib/http-error";
import schema from "../d1/migrations/0001_schema_candidate.sql";
import invariants from "../d1/migrations/0003_domain_invariants.sql";
import teamLootSchema from "../d1/migrations/0004_team_loot_splits.sql";
import supporterSchema from "../d1/migrations/0005_supporter_plan.sql";
export { AbuseBudget } from "./budget";
export { KillBoard } from "./kill-board";
import { fetchKillCandidates } from "../../src/lib/albion/combat-source";
import { archiveList, archiveFind } from "./archive";
import type { LibraryQuery } from "../../src/lib/grind-library-query";

type QueryClient = {
  [model: string]: { [operation: string]: (args?: Record<string, unknown>) => Promise<unknown> };
};
async function executeQuery(client: object, query: DatabaseQuery) {
  validateQuery(query);
  return (client as QueryClient)[query.model][query.operation](sqliteArgs(query.args));
}
function validateBatch(queries: DatabaseQuery[]) {
  if (!Array.isArray(queries) || !queries.length || queries.length > 20)
    throw new HttpError(400, "Invalid database batch");
  for (const query of queries) validateQuery(query);
}

/** Relational account/guild state is one coordination boundary. Static pages, catalogs,
 * archive data, market caches and per-identity abuse limits do not pass through this object.
 * A larger launch will need tenant partitioning or a measured paid database migration.
 */
export class OutpostDatabase extends DurableObject<OutpostDataEnv> {
  readonly #client;
  constructor(ctx: DurableObjectState, env: OutpostDataEnv) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.transactionSync(() => {
        const initialized = this.ctx.storage.sql
          .exec("SELECT name FROM sqlite_master WHERE name = '_outpost_schema'")
          .toArray();
        if (!initialized.length) {
          const existing = this.ctx.storage.sql
            .exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'")
            .toArray();
          if (existing.length) throw new Error("Unrecognized database; migration required");
          this.ctx.storage.sql.exec(schema);
          this.ctx.storage.sql.exec(
            "CREATE TABLE _outpost_schema (version INTEGER NOT NULL PRIMARY KEY)",
          );
          this.ctx.storage.sql.exec("INSERT INTO _outpost_schema (version) VALUES (1)");
        }
        const version = this.ctx.storage.sql
          .exec<{ version: number }>("SELECT version FROM _outpost_schema")
          .one().version;
        if (version === 1) {
          this.ctx.storage.sql.exec(invariants);
          this.ctx.storage.sql.exec("UPDATE _outpost_schema SET version=2 WHERE version=1");
        }
        if (version === 1 || version === 2) {
          this.ctx.storage.sql.exec(teamLootSchema);
          this.ctx.storage.sql.exec("UPDATE _outpost_schema SET version=3 WHERE version IN (1,2)");
        }
        if (version >= 1 && version <= 3) {
          // SQLite ALTER TABLE ADD COLUMN is not idempotent: skip columns that already exist.
          const columns = new Set(
            this.ctx.storage.sql
              .exec<{ name: string }>("SELECT name FROM pragma_table_info('User')")
              .toArray()
              .map((c) => c.name),
          );
          for (const statement of supporterSchema.split(";"))
            if (
              statement.trim() &&
              !(statement.includes("ADD COLUMN") && columns.has(statement.split('"')[3]))
            )
              this.ctx.storage.sql.exec(statement);
          this.ctx.storage.sql.exec(
            "UPDATE _outpost_schema SET version=4 WHERE version IN (1,2,3)",
          );
        } else if (version !== 4) throw new Error("Unsupported database schema version");
      });
    });
    this.#client = storageClient(this.ctx.storage);
  }
  async query(queries: DatabaseQuery[]): Promise<DatabaseReply<unknown[]>> {
    try {
      validateBatch(queries);
      if (queries.some((q) => publicModels.has(q.model)))
        throw new HttpError(400, "Catalog query sent to private storage");
      const value = await this.ctx.storage.transaction(async () => {
        const results = [];
        for (const query of queries) results.push(await executeQuery(this.#client, query));
        return results;
      });
      return { ok: true, value };
    } catch (error) {
      return databaseFailure(error);
    }
  }
  async service(name: string, args: unknown[]): Promise<DatabaseReply> {
    try {
      const value = await this.ctx.storage.transaction(() =>
        databaseContext.run(this.#client, () => executeService(name, args)),
      );
      return { ok: true, value };
    } catch (error) {
      return databaseFailure(error);
    }
  }
  async health() {
    return this.ctx.storage.sql.exec("SELECT 1 AS ok").one().ok === 1;
  }

  /* Point-in-time recovery (Cloudflare keeps 30 days of SQLite history). These methods are
   * reachable only through a Durable Object binding — the public data entrypoint below does not
   * expose them. Operators use scripts/cloudflare-recovery.mjs; see docs/OPERATIONS.md. */
  #recoveryStorage() {
    return this.ctx.storage as unknown as {
      getCurrentBookmark(): Promise<string>;
      getBookmarkForTime(time: number): Promise<string>;
      onNextSessionRestoreBookmark(bookmark: string): Promise<string>;
    };
  }
  async recoveryBookmark(time?: number) {
    const storage = this.#recoveryStorage();
    if (time === undefined) return storage.getCurrentBookmark();
    const limit = Date.now() - 30 * 24 * 3600 * 1000;
    if (!Number.isFinite(time) || time < limit || time > Date.now())
      throw new HttpError(400, "Recovery time must be within the last 30 days");
    return storage.getBookmarkForTime(time);
  }
  /** Schedules the restore and returns a bookmark that undoes it. Call recoveryRestart next. */
  async recoveryRestore(bookmark: string) {
    if (typeof bookmark !== "string" || !/^[0-9a-f-]{16,200}$/i.test(bookmark))
      throw new HttpError(400, "Invalid recovery bookmark");
    return this.#recoveryStorage().onNextSessionRestoreBookmark(bookmark);
  }
  /** Restarts the object so a scheduled restore takes effect. The calling request fails. */
  async recoveryRestart() {
    this.ctx.abort("Point-in-time recovery restart");
  }
}

/** All data methods are binding-only RPC. No public URL can execute a query or service. */
export default class OutpostData extends WorkerEntrypoint<OutpostDataEnv> {
  fetch() {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  async query(queries: DatabaseQuery[]): Promise<DatabaseReply<unknown[]>> {
    try {
      validateBatch(queries);
      const publicQueries = queries.filter((q) => publicModels.has(q.model));
      if (publicQueries.length && publicQueries.length !== queries.length)
        throw new HttpError(400, "Mixed storage transaction unavailable");
      if (!publicQueries.length)
        return this.env.DATABASE.getByName("accounts-v1-eu").query(queries);
      const client = catalogClient(this.env.CATALOG);
      try {
        const value = [];
        // The reviewed catalog is immutable between explicitly activated releases. No private state.
        for (const query of publicQueries) value.push(await executeQuery(client, query));
        return { ok: true, value };
      } finally {
        await client.$disconnect();
      }
    } catch (error) {
      return databaseFailure(error);
    }
  }
  service(name: string, args: unknown[]) {
    return this.env.DATABASE.getByName("accounts-v1-eu").service(name, args);
  }
  async health() {
    const [privateStorage, catalog] = await Promise.all([
      this.env.DATABASE.getByName("accounts-v1-eu").health(),
      this.env.CATALOG.prepare("SELECT 1 AS ok").first<{ ok: number }>(),
    ]);
    return privateStorage && catalog?.ok === 1;
  }
  async #budget(key: string) {
    if (typeof key !== "string" || !key.length || key.length > 500)
      throw new Error("Invalid rate identity");
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
    );
    const name = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return this.env.BUDGETS.getByName(name);
  }
  async rateLimit(key: string, limit: number, seconds: number) {
    return (await this.#budget(key)).allow(limit, seconds);
  }
  async upstreamBlocked(region: string) {
    if (!["europe", "americas", "asia"].includes(region)) throw new Error("Invalid region");
    return (await this.#budget(`upstream:${region}`)).blocked();
  }
  async upstreamBlock(region: string, milliseconds: number) {
    if (!["europe", "americas", "asia"].includes(region)) throw new Error("Invalid region");
    return (await this.#budget(`upstream:${region}`)).block(milliseconds);
  }
  /** The server's seven-day kill shortlist, kept by the cron trigger below. */
  async topKills(region: string) {
    if (!["europe", "americas", "asia"].includes(region)) throw new Error("Invalid region");
    return this.env.KILLS.getByName(region).shortlist();
  }
  /** Every minute: read each server's live kill feed and the weekly ranking into its shortlist. */
  async scheduled() {
    await Promise.allSettled(
      (["europe", "americas", "asia"] as const).map(async (region) => {
        const candidates = await fetchKillCandidates(region);
        if (!candidates.length) return;
        await this.env.KILLS.getByName(region).record(
          candidates.map((kill) => ({ ...kill, raw: JSON.stringify(kill.raw) })),
        );
      }),
    );
  }
  archiveList(kind: string, input: LibraryQuery) {
    return archiveList(this.env.CATALOG, kind, input);
  }
  archiveFind(kind: string, keys: string[]) {
    return archiveFind(this.env.CATALOG, kind, keys);
  }
}
