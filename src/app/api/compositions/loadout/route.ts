import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { authOptions } from "@/lib/auth";
import { resolveBuildLoadout } from "@/lib/compositions/build-loadout-source";
export const GET = apiHandler("composition.loadout", async (req: NextRequest) => {
  const user = await getServerSession(authOptions);
  if (!user?.user?.id) throw new HttpError(401, "Sign in to attach a build");
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new HttpError(400, "Select a build");
  return NextResponse.json(await resolveBuildLoadout(id, user.user.id));
});
