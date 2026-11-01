import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { requireModerator } from "@/lib/community/access";
import { moderateReport } from "@/lib/community/moderation";
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
  return NextResponse.json(await moderateReport(auth.userId!, v));
});
