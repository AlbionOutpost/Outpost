import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { requireModerator } from "@/lib/community/access";
import { moderatorAction } from "@/lib/community/validation";
export const GET = apiHandler("moderation.queue", async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in required");
  await requireModerator(session.user.id);
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(1000).default(1),
      status: z.enum(["OPEN", "RESOLVED", "DISMISSED", "ALL"]).default("OPEN"),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const reports = await db.contentReport.findMany({
    where: q.status === "ALL" ? {} : { status: q.status },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (q.page - 1) * 20,
    take: 21,
    include: {
      build: { select: { id: true, title: true, hiddenAt: true } },
      composition: { select: { id: true, title: true, hiddenAt: true } },
      comment: { select: { id: true, body: true, hiddenAt: true } },
    },
  });
  return NextResponse.json({
    reports: reports.slice(0, 20),
    hasNext: reports.length > 20,
    page: q.page,
  });
});
export const POST = apiHandler("moderation.review", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const v = moderatorAction.parse(await boundedJson(req));
  try {
    return await db.$transaction(
      async (tx) => {
        await requireModerator(auth.userId!, tx);
        const report = await tx.contentReport.findUnique({ where: { id: v.reportId } });
        if (!report) throw new HttpError(404, "Report not found");
        if (report.version !== v.version)
          throw new HttpError(409, "Report changed; refresh the queue");
        const hiddenAt = v.action === "hide" ? new Date() : null;
        let type: string, id: string;
        if (report.buildId) {
          type = "build";
          id = report.buildId;
          if (["hide", "restore"].includes(v.action))
            await tx.build.update({ where: { id }, data: { hiddenAt } });
        } else if (report.compositionId) {
          type = "composition";
          id = report.compositionId;
          if (["hide", "restore"].includes(v.action))
            await tx.composition.update({ where: { id }, data: { hiddenAt } });
        } else if (report.commentId) {
          type = "comment";
          id = report.commentId;
          if (["hide", "restore"].includes(v.action))
            await tx.contentComment.update({ where: { id }, data: { hiddenAt } });
        } else throw new HttpError(409, "Reported target no longer exists");
        await tx.contentReport.update({
          where: { id: report.id, version: v.version },
          data: {
            status: v.action === "dismiss" ? "DISMISSED" : "RESOLVED",
            reviewerId: auth.userId!,
            reviewNote: v.note,
            reviewedAt: new Date(),
            version: { increment: 1 },
          },
        });
        await tx.moderationLog.create({
          data: {
            actorId: auth.userId!,
            targetType: type,
            targetId: id,
            action: v.action,
            reason: v.note,
          },
        });
        return NextResponse.json({ reviewed: true });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(e.code))
      throw new HttpError(409, "Another review won. Refresh and retry.");
    throw e;
  }
});
