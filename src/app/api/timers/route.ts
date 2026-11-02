import { accountPage, accountPageFilter, accountPageOrder } from "@/lib/account-pagination";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { timerInput } from "@/lib/timers/engine";
export const GET = apiHandler("timer.list", async (req: NextRequest) => {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) throw new HttpError(401, "Sign in required");
  const rows = await db.timer.findMany({
    where: { userId: s.user.id, ...accountPageFilter(req.nextUrl.searchParams.get("cursor")) },
    orderBy: [...accountPageOrder],
    take: 101,
  });
  const page = accountPage(rows, 100);
  return NextResponse.json(page.items, {
    headers: page.cursor ? { "X-Next-Cursor": page.cursor } : {},
  });
});
export const POST = apiHandler("timer.create", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const v = timerInput.parse(await boundedJson(req));
  const durationMs = v.durationMinutes * 60000;
  return NextResponse.json(
    await db.timer.create({
      data: {
        userId: auth.userId!,
        title: v.title,
        category: v.category,
        durationMs,
        dueAt: new Date(Date.now() + durationMs),
      },
    }),
    { status: 201 },
  );
});
