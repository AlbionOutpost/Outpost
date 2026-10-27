import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser } from "@/lib/http";
export const DELETE = apiHandler(
  "market-watch.delete",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    const id = z
      .string()
      .min(1)
      .max(100)
      .parse((await ctx.params).id);
    const result = await db.marketWatchItem.deleteMany({ where: { id, userId: auth.userId! } });
    if (!result.count) throw new HttpError(404, "Watchlist item not found");
    return NextResponse.json({ deleted: true });
  },
);
