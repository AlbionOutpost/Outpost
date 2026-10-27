import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser } from "@/lib/http";
import { duplicateComposition } from "@/lib/compositions/service";
export const POST = apiHandler(
  "composition.duplicate",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    return NextResponse.json(await duplicateComposition((await ctx.params).id, auth.userId!), {
      status: 201,
    });
  },
);
