import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { requireAdmin } from "@/lib/admin/access";
import { adminUserDetail } from "@/lib/admin/queries";
import { adminUserAction } from "@/lib/admin/service";
export const GET = apiHandler(
  "admin.user",
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const s = await getServerSession(authOptions);
    if (!s?.user?.id) throw new HttpError(401, "Sign in required");
    return NextResponse.json(await adminUserDetail(s.user.id, (await context.params).id));
  },
);
export const POST = apiHandler(
  "admin.user.change",
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    await requireAdmin(auth.userId!);
    return NextResponse.json(
      await adminUserAction(auth.userId!, (await context.params).id, await boundedJson(req, 8192)),
    );
  },
);
