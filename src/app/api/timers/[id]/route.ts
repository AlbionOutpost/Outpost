import { NextRequest, NextResponse } from "next/server";
import { mutationUser, boundedJson } from "@/lib/http";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { db } from "@/lib/db";
import { timerAction, timerTransition } from "@/lib/timers/engine";
type Context = { params: Promise<{ id: string }> };
export const PATCH = apiHandler("timer.update", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params,
    input = timerAction.parse(await boundedJson(req));
  const t = await db.timer.findFirst({ where: { id, userId: auth.userId! } });
  if (!t) throw new HttpError(404, "Timer not found");
  if (t.version !== input.version)
    throw new HttpError(409, "Timer changed. Reload before updating.");
  let data;
  try {
    data =
      input.action === "rename"
        ? { title: input.title }
        : timerTransition(t, input.action, Date.now());
  } catch (e) {
    throw new HttpError(409, e instanceof Error ? e.message : "Invalid timer state");
  }
  const updated = await db.timer.updateMany({
    where: { id, userId: auth.userId!, version: input.version },
    data: { ...data, version: { increment: 1 } },
  });
  if (!updated.count) throw new HttpError(409, "Another timer update won. Reload and retry.");
  return NextResponse.json({ updated: true });
});
export const DELETE = apiHandler("timer.delete", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const d = await db.timer.deleteMany({ where: { id, userId: auth.userId! } });
  if (!d.count) throw new HttpError(404, "Timer not found");
  return NextResponse.json({ deleted: true });
});
