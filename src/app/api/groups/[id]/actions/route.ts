import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { mutateGroup } from "@/lib/groups/service";
export const POST = apiHandler(
  "group.action",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    return NextResponse.json(
      await mutateGroup((await ctx.params).id, auth.userId!, await boundedJson(req)),
    );
  },
);
