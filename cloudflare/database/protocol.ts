import { HttpError } from "../../src/lib/http-error";

export const models = new Set([
  "user",
  "account",
  "session",
  "verificationToken",
  "build",
  "buildEquipment",
  "buildVersion",
  "buildFavorite",
  "buildVote",
  "composition",
  "compositionVersion",
  "compositionFavorite",
  "group",
  "groupMember",
  "groupMembershipRequest",
  "groupInvitation",
  "groupAnnouncement",
  "groupEvent",
  "eventRSVP",
  "groupBuild",
  "groupLootSplit",
  "contentComment",
  "commentRevision",
  "contentReport",
  "moderationLog",
  "itemMetadata",
  "catalogRelease",
  "savedScenario",
  "marketWatchItem",
  "timer",
]);
export const readOperations = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const operations = new Set([
  ...readOperations,
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);
export const publicModels = new Set(["itemMetadata", "catalogRelease"]);
export type DatabaseQuery = { model: string; operation: string; args?: Record<string, unknown> };
export type DatabaseReply<T = unknown> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: {
        kind: "http" | "prisma" | "unavailable";
        status?: number;
        code?: string;
        message?: string;
      };
    };

export function validateQuery(query: DatabaseQuery) {
  if (!query || !models.has(query.model) || !operations.has(query.operation))
    throw new HttpError(400, "Unsupported database operation");
  if (publicModels.has(query.model) && !readOperations.has(query.operation))
    throw new HttpError(403, "Catalog writes require a reviewed import");
  // RPC is private, but accidental unbounded query graphs must also fail before storage work.
  const encoded = JSON.stringify(query.args ?? {});
  if (encoded.length > 2_000_000) throw new HttpError(413, "Database request too large");
}

/** Prisma SQLite has no `mode`; SQLite LIKE supplies the existing ASCII-insensitive semantics.
 * Only remove mode in filter objects. Never rewrite user JSON payloads/snapshots.
 */
function sqliteFilter(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sqliteFilter);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  for (const [key, child] of Object.entries(value)) {
    if (
      ["contains", "startsWith", "endsWith"].includes(key) &&
      typeof child === "string" &&
      new TextEncoder().encode(child).length > 48 &&
      /[%_]/.test(child)
    )
      throw new HttpError(400, "Long searches must use literal text without wildcard characters");
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "mode")
      .map(([key, child]) => [key, sqliteFilter(child)]),
  );
}
export function sqliteArgs(
  args: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!args) return args;
  const result = { ...args };
  for (const key of ["where", "cursor", "having"])
    if (key in result) result[key] = sqliteFilter(result[key]);
  for (const key of ["include", "select"]) {
    const tree = result[key];
    if (tree && typeof tree === "object" && !Array.isArray(tree))
      result[key] = Object.fromEntries(
        Object.entries(tree).map(([name, relation]) => [
          name,
          relation && typeof relation === "object" && !Array.isArray(relation)
            ? sqliteArgs(relation as Record<string, unknown>)
            : relation,
        ]),
      );
  }
  return result;
}

export function databaseFailure(error: unknown): DatabaseReply<never> {
  if (error instanceof Error) {
    const cause = error.cause as { originalMessage?: unknown; kind?: unknown } | undefined;
    const message = [
      error.message,
      typeof cause?.originalMessage === "string" ? cause.originalMessage : "",
    ]
      .join(" ")
      .toLowerCase();
    console.error(
      JSON.stringify({
        event: "database_failure",
        type: error.name,
        reason: [
          "wasm",
          "no such column",
          "no such table",
          "quota",
          "cpu",
          "unsupported",
          "not implemented",
          "timeout",
          "like",
          "pattern",
          "escape",
          "syntax",
          "bind",
          "too complex",
          "d1_error",
          "too many",
          "exceeded",
          "time",
          "limit",
          "request",
          "daily",
          "account",
          "rows",
          "read",
          "write",
          "size",
          "depth",
          "complexity",
          "too large",
          "memory",
        ].filter((term) => message.includes(term)),
      }),
    );
  }
  if (error instanceof HttpError)
    return { ok: false, error: { kind: "http", status: error.status, message: error.message } };
  if (error instanceof Error && error.name === "ZodError")
    return { ok: false, error: { kind: "http", status: 400, message: "Invalid request data" } };
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  )
    return { ok: false, error: { kind: "prisma", code: error.code } };
  return { ok: false, error: { kind: "unavailable" } };
}
