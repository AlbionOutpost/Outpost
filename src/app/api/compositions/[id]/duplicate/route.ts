import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, spendSaveBudget } from "@/lib/http";
import { saveSizeLimit } from "@/lib/storage-limits";
import { duplicateComposition } from "@/lib/compositions/service";
export const POST = apiHandler(
  "composition.duplicate",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    // A copy is counted at the largest size a comp save can be.
    await spendSaveBudget(auth.userId!, saveSizeLimit.composition);
    return NextResponse.json(await duplicateComposition((await ctx.params).id, auth.userId!), {
      status: 201,
    });
  },
);
