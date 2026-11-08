import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, spendSaveBudget } from "@/lib/http";
import { saveSizeLimit } from "@/lib/storage-limits";
import { duplicateBuild } from "@/lib/builds/service";
export const POST = apiHandler(
  "build.duplicate",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    // A copy is counted at the largest size a build save can be.
    await spendSaveBudget(auth.userId!, saveSizeLimit.build);
    return NextResponse.json(await duplicateBuild((await ctx.params).id, auth.userId!), {
      status: 201,
    });
  },
);
