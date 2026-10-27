import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { watchInput } from "@/lib/market-watch";
import { retrySerialization } from "@/lib/serialization-retry";
export const GET = apiHandler("market-watch.list", async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in to use your watchlist");
  const rows = await db.marketWatchItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 100,
    select: { id: true, region: true, itemId: true, quality: true },
  });
  return NextResponse.json(rows);
});
export const POST = apiHandler("market-watch.save", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const input = watchInput.parse(await boundedJson(req, 2048));
  const row = await retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const identity = { userId: auth.userId!, ...input };
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
        if ((await tx.marketWatchItem.count({ where: { userId: auth.userId! } })) >= 100)
          throw new HttpError(409, "Your watchlist is full (100 items). Remove an item first.");
        return tx.marketWatchItem.create({
          data: identity,
          select: { id: true, region: true, itemId: true, quality: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  return NextResponse.json(row, { status: 201 });
});
