import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { rateLimit } from "@/lib/redis";
import { changeGiveaway, giveawayBoard } from "@/lib/giveaways/service";
/** Site-wide giveaways: open ones and recent draws, with the viewer's own entry when signed in. */
export const GET = apiHandler("giveaways.read", async () => {
  const session = await getServerSession(authOptions);
  return NextResponse.json({ board: await giveawayBoard(null, session?.user?.id ?? null) });
});
/** Enter or leave (any signed-in player); start, edit, cancel or draw (Outpost staff only). */
export const POST = apiHandler("giveaways.change", async (req: NextRequest) => {
  const actor = await mutationUser(req);
  if (actor.error) return actor.error;
  if (!(await rateLimit(`giveaway:${actor.userId}`, 20, 60)))
    throw new HttpError(429, "Too many giveaway changes. Wait a minute.");
  return NextResponse.json(await changeGiveaway(null, actor.userId!, await boundedJson(req, 8192)));
});
