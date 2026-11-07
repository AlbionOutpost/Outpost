import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { rateLimit } from "@/lib/redis";
import { requireTeamManagement } from "@/lib/billing/gate";
import { teamGames } from "@/lib/groups/economy-service";
type Context = { params: Promise<{ id: string }> };
/** The team's recent coin flips and loot rolls. */
export const GET = apiHandler("team.games.read", async (_req: NextRequest, ctx: Context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in to view team rolls and flips");
  return NextResponse.json(await teamGames((await ctx.params).id, session.user.id));
});
/** Flip, answer a flip, open, roll in, close or cancel a loot roll. Outcomes come from the server. */
export const POST = apiHandler("team.games.play", async (req: NextRequest, ctx: Context) => {
  const actor = await mutationUser(req);
  if (actor.error) return actor.error;
  if (!(await rateLimit(`team-play:${actor.userId}`, 20, 60)))
    throw new HttpError(429, "Too many flips and rolls. Wait a minute.");
  const id = (await ctx.params).id;
  await requireTeamManagement(id, undefined, actor.userId!);
  return NextResponse.json(await teamGames(id, actor.userId!, await boundedJson(req, 4096)));
});
