import type { PrismaClient } from "@prisma/client";
import { Prisma } from "./prisma-web";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "../../src/lib/http-error";
import { models, type DatabaseQuery, type DatabaseReply, validateQuery } from "./protocol";
import { publicCatalogQuery } from "./public-assets";
import { publicModels } from "./protocol";
import type { LibraryQuery } from "../../src/lib/grind-library-query";

export interface OutpostDatabaseBinding {
  query(queries: DatabaseQuery[]): Promise<DatabaseReply<unknown[]>>;
  service(name: string, args: unknown[]): Promise<DatabaseReply>;
  health(): Promise<boolean>;
  rateLimit(key: string, limit: number, seconds: number): Promise<boolean>;
  upstreamBlocked(region: string): Promise<boolean>;
  upstreamBlock(region: string, milliseconds: number): Promise<void>;
  archiveList(kind: string, input: LibraryQuery): Promise<unknown>;
  archiveFind(kind: string, keys: string[]): Promise<unknown[]>;
  topKills(region: string): Promise<{
    kills: { id: number; occurredAt: number; fame: number; raw: unknown }[];
    collectedAt: string | null;
  }>;
}
export function databaseBinding(): OutpostDatabaseBinding {
  const env = getCloudflareContext().env;
  if (!("OUTPOST_DATA" in env) || !env.OUTPOST_DATA)
    throw new Error("Private database binding missing");
  return env.OUTPOST_DATA as OutpostDatabaseBinding;
}
function unwrap<T>(reply: DatabaseReply<T>): T {
  if (reply.ok) return reply.value;
  if (reply.error.kind === "http")
    throw new HttpError(reply.error.status ?? 503, reply.error.message ?? "Database unavailable");
  if (reply.error.kind === "prisma")
    throw new Prisma.PrismaClientKnownRequestError("Database operation rejected", {
      code: reply.error.code!,
      clientVersion: "6.19.3",
    });
  throw new Error("Private database unavailable");
}
async function resolveQueries(queries: DatabaseQuery[]): Promise<unknown[]> {
  const reply = await databaseBinding().query(queries);
  if (
    !reply.ok &&
    reply.error.kind === "unavailable" &&
    queries.every((q) => publicModels.has(q.model))
  )
    return Promise.all(queries.map(publicCatalogQuery));
  return unwrap(reply);
}
// A lazy query preserves Prisma's array transaction interface. No request is made on construction.
class RemoteQuery implements PromiseLike<unknown> {
  constructor(readonly query: DatabaseQuery) {
    validateQuery(query);
  }
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return resolveQueries([this.query])
      .then(([value]) => value)
      .then(onfulfilled, onrejected);
  }
}
const delegates = new Map<string, object>();
const facade = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "$transaction")
        return async (work: RemoteQuery[] | ((tx: object) => RemoteQuery)) => {
          const result = typeof work === "function" ? work(facade) : work;
          if (result instanceof RemoteQuery) return (await resolveQueries([result.query]))[0];
          if (Array.isArray(result) && result.every((q) => q instanceof RemoteQuery))
            return resolveQueries(result.map((q) => q.query));
          throw new Error(
            "Interactive transactions must execute in a named private database service",
          );
        };
      if (property === "$queryRaw")
        return async (strings: TemplateStringsArray, ...values: unknown[]) => {
          if (strings.join("") !== "SELECT 1" || values.length)
            throw new Error("Raw SQL is not available through the website binding");
          if (!(await databaseBinding().health())) throw new Error("Private database unavailable");
          return [{ "1": 1 }];
        };
      if (typeof property !== "string" || !models.has(property)) return undefined;
      if (!delegates.has(property))
        delegates.set(
          property,
          new Proxy(
            {},
            {
              get: (_t, operation) => (args?: Record<string, unknown>) =>
                new RemoteQuery({ model: property, operation: String(operation), args }),
            },
          ),
        );
      return delegates.get(property);
    },
  },
);
export const db = facade as PrismaClient;
export function databaseService<T>(name: string, args: unknown[]): Promise<T> {
  return databaseBinding()
    .service(name, args)
    .then((reply) => unwrap(reply) as T);
}
