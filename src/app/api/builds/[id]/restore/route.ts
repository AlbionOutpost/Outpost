import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { buildInput } from "@/lib/builds/validation";
import { reviseBuild } from "@/lib/builds/service";
export const POST = apiHandler(
  "build.restore",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await mutationUser(req);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    const body = z
      .object({ revision: z.number().int().positive(), version: z.number().int().positive() })
      .parse(await boundedJson(req));
    const build = await db.build.findFirst({
      where: { id, authorId: auth.userId },
      select: { id: true, visibility: true },
    });
    if (!build) throw new HttpError(404, "Build not found");
    const revision = await db.buildVersion.findUnique({
      where: { buildId_version: { buildId: id, version: body.revision } },
    });
    if (!revision) throw new HttpError(404, "Revision not found");
    return NextResponse.json(
      await reviseBuild(
        id,
        auth.userId!,
        buildInput.parse({ ...buildInput.parse(revision.snapshot), visibility: build.visibility }),
        body.version,
      ),
    );
  },
);
