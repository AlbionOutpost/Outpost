import { Prisma } from "@/lib/prisma-runtime";
import { z } from "zod";
import { db, databaseService } from "../db";
import { HttpError } from "../http-error";
import { communityTarget } from "./access";
import { communityAction, targetKind } from "./validation";
async function localCommunityMutation(
  kind: z.infer<typeof targetKind>,
  id: string,
  userId: string,
  raw: unknown,
) {
  const input = communityAction.parse(raw);
  try {
    return await db.$transaction(
      async (tx) => {
        const target = await communityTarget(kind, id, userId, tx),
          filter = kind === "build" ? { buildId: id } : { compositionId: id };
        if (input.action === "favorite") {
          if (kind === "build") {
            if (input.active)
              await tx.buildFavorite.upsert({
                where: { userId_buildId: { userId, buildId: id } },
                create: { userId, buildId: id },
                update: {},
              });
            else await tx.buildFavorite.deleteMany({ where: { userId, buildId: id } });
          } else {
            if (input.active)
              await tx.compositionFavorite.upsert({
                where: { userId_compositionId: { userId, compositionId: id } },
                create: { userId, compositionId: id },
                update: {},
              });
            else await tx.compositionFavorite.deleteMany({ where: { userId, compositionId: id } });
          }
          return { favorite: input.active };
        }
        if (input.action === "vote") {
          if (kind !== "build") throw new HttpError(400, "Votes are supported for builds only");
          if (target.authorId === userId)
            throw new HttpError(400, "Authors cannot vote for their own builds");
          if (input.active)
            await tx.buildVote.upsert({
              where: { userId_buildId: { userId, buildId: id } },
              create: { userId, buildId: id },
              update: {},
            });
          else await tx.buildVote.deleteMany({ where: { userId, buildId: id } });
          return { voted: input.active };
        }
        if (input.action === "comment") {
          if (
            await tx.contentComment.findFirst({
              where: {
                ...filter,
                authorId: userId,
                body: input.body,
                createdAt: { gt: new Date(Date.now() - 60000) },
              },
            })
          )
            throw new HttpError(409, "This comment was already submitted recently");
          const c = await tx.contentComment.create({
            data: {
              ...filter,
              authorId: userId,
              body: input.body,
              revisions: { create: { version: 1, body: input.body } },
            },
          });
          return { id: c.id };
        }
        if (input.action === "edit-comment" || input.action === "delete-comment") {
          const c = await tx.contentComment.findFirst({
            where: { id: input.commentId, ...filter, authorId: userId, deletedAt: null },
          });
          if (!c) throw new HttpError(404, "Comment not found");
          if (c.version !== input.version)
            throw new HttpError(409, "Comment changed. Reload before editing.");
          const body = input.action === "edit-comment" ? input.body : c.body;
          await tx.contentComment.update({
            where: { id: c.id, version: input.version },
            data: {
              body,
              version: { increment: 1 },
              ...(input.action === "delete-comment" ? { deletedAt: new Date() } : {}),
              revisions: { create: { version: c.version + 1, body } },
            },
          });
          return { id: c.id };
        }
        if (
          input.commentId &&
          !(await tx.contentComment.findFirst({
            where: { id: input.commentId, ...filter, deletedAt: null },
          }))
        )
          throw new HttpError(404, "Comment not found");
        const reportTarget = input.commentId ? { commentId: input.commentId } : filter;
        if (
          await tx.contentReport.findFirst({
            where: { ...reportTarget, authorId: userId, status: "OPEN" },
          })
        )
          throw new HttpError(409, "You already have an open report for this content");
        const r = await tx.contentReport.create({
          data: { ...reportTarget, authorId: userId, reason: input.reason },
        });
        return { id: r.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2034", "P2025", "P2002"].includes(e.code)
    )
      throw new HttpError(409, "Another update won. Reload and retry.");
    throw e;
  }
}

export const communityMutation: typeof localCommunityMutation = (...args) =>
  databaseService<Awaited<ReturnType<typeof localCommunityMutation>>>("communityMutation", args) ??
  localCommunityMutation(...args);
