import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { watchInput } from "@/lib/market-watch";
import { saveWatchItem } from "@/lib/market-watch-service";
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
  const row = await saveWatchItem(auth.userId!, input);
  return NextResponse.json(row, { status: 201 });
});
