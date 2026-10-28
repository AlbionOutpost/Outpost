import { Prisma } from "@/lib/prisma-runtime";
import { z } from "zod";
import { db, databaseService } from "./db";
import { HttpError } from "./http-error";
import { watchInput } from "./market-watch";
import { retrySerialization } from "./serialization-retry";
async function localSaveWatchItem(userId: string, input: z.infer<typeof watchInput>) {
  input = watchInput.parse(input);
  const row = await retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const identity = { userId: userId, ...input };
        const existing = await tx.marketWatchItem.findUnique({
          where: { userId_region_itemId_quality: identity },
        });
        if (existing)
          return {
            id: existing.id,
            region: existing.region,
            itemId: existing.itemId,
            quality: existing.quality,
          };
        if ((await tx.marketWatchItem.count({ where: { userId: userId } })) >= 100)
          throw new HttpError(409, "Your watchlist is full (100 items). Remove an item first.");
        return tx.marketWatchItem.create({
          data: identity,
          select: { id: true, region: true, itemId: true, quality: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  return row;
}

export const saveWatchItem: typeof localSaveWatchItem = (...args) =>
  databaseService<Awaited<ReturnType<typeof localSaveWatchItem>>>("saveWatchItem", args) ??
  localSaveWatchItem(...args);
