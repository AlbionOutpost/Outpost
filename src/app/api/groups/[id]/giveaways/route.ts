import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { rateLimit } from "@/lib/redis";
import { changeGiveaway, giveawayBoard } from "@/lib/giveaways/service";
type Context = { params: Promise<{ id: string }> };
/** The team's giveaways, for its members only (outsiders get a 404). */
export const GET = apiHandler("team.giveaways.read", async (_req: NextRequest, ctx: Context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in to view team giveaways");
  return NextResponse.json({ board: await giveawayBoard((await ctx.params).id, session.user.id) });
});
/** Enter or leave (members); start, edit, cancel or draw (Manage giveaways). */
export const POST = apiHandler("team.giveaways.change", async (req: NextRequest, ctx: Context) => {
  const actor = await mutationUser(req);
  if (actor.error) return actor.error;
  if (!(await rateLimit(`giveaway:${actor.userId}`, 20, 60)))
    throw new HttpError(429, "Too many giveaway changes. Wait a minute.");
  const id = (await ctx.params).id;
  return NextResponse.json(await changeGiveaway(id, actor.userId!, await boundedJson(req, 8192)));
});
