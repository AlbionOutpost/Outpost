import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { targetKind, communityAction } from "@/lib/community/validation";
import { verifyTurnstile } from "@/lib/turnstile";
import { communityTarget, requireModerator } from "@/lib/community/access";
import { communityMutation } from "@/lib/community/service";
type Context = { params: Promise<{ kind: string; id: string }> };
export const GET = apiHandler("community.read", async (req: NextRequest, ctx: Context) => {
  const { kind: raw, id } = await ctx.params,
    kind = targetKind.parse(raw),
    session = await getServerSession(authOptions),
    userId = session?.user?.id;
  await communityTarget(kind, id, userId);
  const filter = kind === "build" ? { buildId: id } : { compositionId: id };
  const history = req.nextUrl.searchParams.get("history");
  if (history) {
    const c = await db.contentComment.findFirst({
      where: { id: history.slice(0, 100), ...filter },
      select: { authorId: true, id: true },
    });
    if (!c) throw new HttpError(404, "Comment not found");
    if (c.authorId !== userId) {
      if (!userId) throw new HttpError(401, "Sign in required");
      await requireModerator(userId);
    }
    return NextResponse.json({
      revisions: await db.commentRevision.findMany({
        where: { commentId: c.id },
        orderBy: { version: "desc" },
        take: 50,
        select: { version: true, body: true, createdAt: true },
      }),
    });
  }
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1)
    .parse(req.nextUrl.searchParams.get("page") ?? undefined);
  const comments = await db.contentComment.findMany({
    where: { ...filter, hiddenAt: null, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * 20,
    take: 21,
    select: {
      id: true,
      body: true,
      version: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      author: { select: { name: true } },
    },
  });
  const favoriteCount =
    kind === "build"
      ? await db.buildFavorite.count({ where: { buildId: id } })
      : await db.compositionFavorite.count({ where: { compositionId: id } });
  const favorite = userId
    ? kind === "build"
      ? !!(await db.buildFavorite.findUnique({
          where: { userId_buildId: { userId, buildId: id } },
        }))
      : !!(await db.compositionFavorite.findUnique({
          where: { userId_compositionId: { userId, compositionId: id } },
        }))
    : false;
  return NextResponse.json({
    viewerId: userId ?? null,
    favorite,
    favoriteCount,
    voted:
      kind === "build" && userId
        ? !!(await db.buildVote.findUnique({ where: { userId_buildId: { userId, buildId: id } } }))
        : false,
    voteCount: kind === "build" ? await db.buildVote.count({ where: { buildId: id } }) : null,
    comments: comments.slice(0, 20),
    hasNext: comments.length > 20,
    page,
  });
});
export const POST = apiHandler("community.mutate", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const { kind, id } = await ctx.params;
  const input = communityAction.parse(await boundedJson(req));
  // Authentication, same-origin checks and the existing user request budget run first.
  if (["comment", "edit-comment", "report"].includes(input.action))
    await verifyTurnstile(req.headers.get("x-turnstile-token"), "community_write");
  return NextResponse.json(
    await communityMutation(targetKind.parse(kind), id, auth.userId!, input),
  );
});
