import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/api-errors";
import { groupDashboard } from "@/lib/groups/dashboard";
export const GET = apiHandler(
  "group.read",
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    return NextResponse.json(await groupDashboard((await ctx.params).id, session?.user?.id));
  },
);
