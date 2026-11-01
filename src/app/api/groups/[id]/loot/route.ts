import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { requireTeamManagement } from "@/lib/billing/gate";
import { teamLoot } from "@/lib/groups/loot-service";
type Context = { params: Promise<{ id: string }> };
export const GET = apiHandler("team.loot.read", async (_req: NextRequest, ctx: Context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in to view team loot splits");
  return NextResponse.json(await teamLoot((await ctx.params).id, session.user.id));
});
export const POST = apiHandler("team.loot.save", async (req: NextRequest, ctx: Context) => {
  const actor = await mutationUser(req);
  if (actor.error) return actor.error;
  await requireTeamManagement((await ctx.params).id);
  return NextResponse.json(
    await teamLoot((await ctx.params).id, actor.userId!, await boundedJson(req)),
  );
});
