import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { mutateGroup } from "@/lib/groups/service";
import { requireTeamManagement } from "@/lib/billing/gate";
export const POST = apiHandler(
  "group.action",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    const body = (await boundedJson(req)) as { action?: unknown };
    const id = (await ctx.params).id;
    await requireTeamManagement(id, typeof body?.action === "string" ? body.action : "");
    return NextResponse.json(await mutateGroup(id, auth.userId!, body));
  },
);
