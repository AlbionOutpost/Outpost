import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser } from "@/lib/http";
import { acceptInvitation } from "@/lib/groups/service";
export const POST = apiHandler(
  "invitation.accept",
  async (req: NextRequest, ctx: { params: Promise<{ token: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    return NextResponse.json(await acceptInvitation((await ctx.params).token, auth.userId!));
  },
);
