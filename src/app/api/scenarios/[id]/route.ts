import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser } from "@/lib/http";
export const DELETE = apiHandler(
  "scenario.delete",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    const deleted = await db.savedScenario.deleteMany({
      where: { id: (await ctx.params).id, authorId: auth.userId },
    });
    if (!deleted.count) throw new HttpError(404, "Scenario not found");
    return new NextResponse(null, { status: 204 });
  },
);
