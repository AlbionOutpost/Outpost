import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { db } from "@/lib/db";
import { findLibraryBuild, findLibraryComposition } from "@/lib/grind-library";
import { libraryLikeTarget, setLibraryLike } from "@/lib/library-likes";
type Context = { params: Promise<{ kind: string; slug: string }> };
async function target(ctx: Context) {
  const parsed = libraryLikeTarget.parse(await ctx.params);
  const item =
    parsed.kind === "build"
      ? await findLibraryBuild(parsed.slug)
      : await findLibraryComposition(parsed.slug);
  if (!item) throw new HttpError(404, "Library entry not found");
  return { kind: parsed.kind, slug: item.slug, archivedCount: item.upvotes ?? 0 };
}
export const GET = apiHandler("library-likes.read", async (_req: NextRequest, ctx: Context) => {
  const { archivedCount, ...where } = await target(ctx);
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const [outpostCount, like] = await db.$transaction([
    db.libraryLike.count({ where }),
    db.libraryLike.findFirst({
      where: { ...where, userId: { in: userId ? [userId] : [] } },
      select: { id: true },
    }),
  ]);
  return NextResponse.json({
    archivedCount,
    outpostCount,
    count: archivedCount + outpostCount,
    liked: !!like,
    signedIn: !!userId,
  });
});
export const POST = apiHandler("library-likes.write", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const { active } = z
    .object({ active: z.boolean() })
    .strict()
    .parse(await boundedJson(req, 1024));
  const { archivedCount, kind, slug } = await target(ctx);
  const result = await setLibraryLike(kind, slug, auth.userId!, active);
  return NextResponse.json({
    ...result,
    archivedCount,
    count: archivedCount + result.outpostCount,
    signedIn: true,
  });
});
