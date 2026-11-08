import { Prisma } from "@/lib/prisma-runtime";
import { db, databaseService } from "./db";
import { HttpError } from "./http-error";
import { retrySerialization } from "./serialization-retry";
import {
  LIBRARY_FAVORITE_LIMIT,
  MASTERY_LEVEL_LIMIT,
  accountSavesRequest,
  favoritesToAdd,
  mergeMasteryLevels,
  type AccountSavesRequest,
} from "./account-saves";

type Saves = { favorites: string[]; levels: Record<string, number> };

/**
 * The signed-in account's library favorites (newest first) and spec levels, read and changed
 * inside one transaction that first re-checks the account row. `userId` comes from the server
 * session only; favorite keys must already be resolved against the library by the caller.
 */
async function localAccountSaves(
  userId: string,
  request: AccountSavesRequest | { action: "read" },
): Promise<Saves & { favorite?: boolean; skipped?: number }> {
  const input = request.action === "read" ? request : accountSavesRequest.parse(request);
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        if (!(await tx.user.findUnique({ where: { id: userId }, select: { id: true } })))
          throw new HttpError(401, "Sign in required");
        const read = async () => {
          const favorites = await tx.libraryFavorite.findMany({
            where: { userId },
            orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
            take: LIBRARY_FAVORITE_LIMIT,
            select: { slug: true },
          });
          const levels = await tx.masteryLevel.findMany({
            where: { userId },
            take: MASTERY_LEVEL_LIMIT,
            select: { specId: true, level: true },
          });
          return {
            favorites: favorites.map((f) => f.slug),
            levels: Object.fromEntries(levels.map((l) => [l.specId, l.level])),
          };
        };
        const replaceLevels = async (levels: Record<string, number>) => {
          const rows = Object.entries(levels).filter(([, level]) => level > 0);
          await tx.masteryLevel.deleteMany({ where: { userId } });
          if (rows.length)
            await tx.masteryLevel.createMany({
              data: rows.map(([specId, level]) => ({ userId, specId, level })),
            });
        };
        if (input.action === "read") return read();
        if (input.action === "favorite") {
          const identity = { userId, slug: input.slug };
          if (!input.active) await tx.libraryFavorite.deleteMany({ where: identity });
          else if (!(await tx.libraryFavorite.findUnique({ where: { userId_slug: identity } }))) {
            if ((await tx.libraryFavorite.count({ where: { userId } })) >= LIBRARY_FAVORITE_LIMIT)
              throw new HttpError(
                409,
                `You can save up to ${LIBRARY_FAVORITE_LIMIT} library builds. Remove one first.`,
              );
            await tx.libraryFavorite.create({ data: identity });
          }
          return { ...(await read()), favorite: input.active };
        }
        if (input.action === "levels") {
          await replaceLevels(input.levels);
          return read();
        }
        // Merge a device copy: add what the account lacks (newest device entry ends up first),
        // keep the higher level per spec. Idempotent: the same copy again changes nothing.
        const current = await read();
        const add = favoritesToAdd(current.favorites, input.favorites);
        const base = Date.now();
        if (add.length)
          await tx.libraryFavorite.createMany({
            // Device order is newest first; older device entries get earlier times.
            data: add.map((slug, i) => ({ userId, slug, createdAt: new Date(base - i) })),
          });
        const saved = (id: string) => (Object.hasOwn(current.levels, id) ? current.levels[id] : 0);
        if (Object.entries(input.levels).some(([id, level]) => level > saved(id))) {
          const levels = mergeMasteryLevels(current.levels, input.levels);
          if (Object.keys(levels).length > MASTERY_LEVEL_LIMIT)
            throw new HttpError(400, "Too many specs");
          await replaceLevels(levels);
        }
        const skipped =
          new Set(input.favorites.filter((s) => !current.favorites.includes(s))).size - add.length;
        return { ...(await read()), skipped };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

export const accountSaves: typeof localAccountSaves = (...args) =>
  databaseService<Awaited<ReturnType<typeof localAccountSaves>>>("accountSaves", args) ??
  localAccountSaves(...args);
