import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { eventCalendar } from "@/lib/groups/calendar";
export const GET = apiHandler(
  "group.calendar",
  async (_req: NextRequest, ctx: { params: Promise<{ id: string; eventId: string }> }) => {
    const s = await getServerSession(authOptions);
    if (!s?.user?.id) throw new HttpError(401, "Sign in required");
    const { id, eventId } = await ctx.params;
    if (
      !(await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: s.user.id } },
      }))
    )
      throw new HttpError(404, "Event not found");
    const e = await db.groupEvent.findFirst({ where: { id: eventId, groupId: id } });
    if (!e) throw new HttpError(404, "Event not found");
    return new Response(eventCalendar(e), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="atlas-event.ics"',
      },
    });
  },
);
