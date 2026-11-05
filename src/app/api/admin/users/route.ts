import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { adminUsers } from "@/lib/admin/queries";
export const GET = apiHandler("admin.users", async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in required");
  return NextResponse.json(
    await adminUsers(session.user.id, Object.fromEntries(req.nextUrl.searchParams)),
  );
});
