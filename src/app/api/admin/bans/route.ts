import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { adminBanAction } from "@/lib/admin/service";
export const GET = apiHandler("admin.bans", async (req: NextRequest) => {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) throw new HttpError(401, "Sign in required");
  await requireAdmin(s.user.id);
  const discordId = req.nextUrl.searchParams.get("discordId");
  if (!discordId || !/^\d{17,20}$/.test(discordId))
    throw new HttpError(400, "Enter a valid Discord ID");
  return NextResponse.json({ ban: await db.discordBan.findUnique({ where: { discordId } }) });
});
export const POST = apiHandler("admin.ban", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  await requireAdmin(auth.userId!);
  return NextResponse.json(await adminBanAction(auth.userId!, await boundedJson(req, 8192)));
});
