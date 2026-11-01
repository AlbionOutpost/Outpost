import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviseBuild } from "@/lib/builds/service";
import { buildInput, canReadBuild } from "@/lib/builds/validation";
import { mutationUser, boundedJson } from "@/lib/http";
import { apiHandler, HttpError } from "@/lib/api-errors";
type Context = { params: Promise<{ id: string }> };
export const GET = apiHandler("build.read", async (_req: NextRequest, ctx: Context) => {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const build = await db.build.findUnique({
    where: { id },
    include: { equipment: { orderBy: { slot: "asc" } } },
  });
  if (
    !build ||
    (build.hiddenAt && build.authorId !== session?.user?.id) ||
    !canReadBuild(build.visibility, build.authorId, session?.user?.id)
  )
    throw new HttpError(404, "Build not found");
  return NextResponse.json(build);
});
export const PUT = apiHandler("build.update", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = z
    .object({ version: z.number().int().positive(), build: buildInput })
    .parse(await boundedJson(req));
  const result = await reviseBuild(id, auth.userId!, body.build, body.version);
  return NextResponse.json(result);
});
export const DELETE = apiHandler("build.delete", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const result = await db.build.deleteMany({ where: { id, authorId: auth.userId } });
  if (!result.count) throw new HttpError(404, "Build not found");
  return new NextResponse(null, { status: 204 });
});
