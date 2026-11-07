import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { requireTeamManagement } from "@/lib/billing/gate";
import { teamWallet } from "@/lib/groups/economy-service";
type Context = { params: Promise<{ id: string }> };
/** The team pot and the viewer's own balance; every balance and the ledger with Manage wallet. */
export const GET = apiHandler("team.wallet.read", async (_req: NextRequest, ctx: Context) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in to view the team wallet");
  return NextResponse.json(await teamWallet((await ctx.params).id, session.user.id));
});
/** Credit, debit, pay out or reset a wallet, or pay a saved loot split into wallets. */
export const POST = apiHandler("team.wallet.change", async (req: NextRequest, ctx: Context) => {
  const actor = await mutationUser(req);
  if (actor.error) return actor.error;
  const id = (await ctx.params).id;
  await requireTeamManagement(id, undefined, actor.userId!);
  return NextResponse.json(await teamWallet(id, actor.userId!, await boundedJson(req, 4096)));
});
