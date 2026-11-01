import { Prisma } from "@/lib/prisma-runtime";
import { z } from "zod";
import { db, databaseService } from "../db";
import { HttpError } from "../http-error";
import { requireModerator } from "./access";
import { moderatorAction } from "./validation";
async function localModerateReport(userId: string, v: z.infer<typeof moderatorAction>) {
  v = moderatorAction.parse(v);
  try {
    return await db.$transaction(
      async (tx) => {
        await requireModerator(userId, tx);
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
            reviewerId: userId,
            reviewNote: v.note,
            reviewedAt: new Date(),
            version: { increment: 1 },
          },
        });
        await tx.moderationLog.create({
          data: {
            actorId: userId,
            targetType: type,
            targetId: id,
            action: v.action,
            reason: v.note,
          },
        });
        return { reviewed: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(e.code))
      throw new HttpError(409, "Another review won. Refresh and retry.");
    throw e;
  }
}

export const moderateReport: typeof localModerateReport = (...args) =>
  databaseService<Awaited<ReturnType<typeof localModerateReport>>>("moderateReport", args) ??
  localModerateReport(...args);
