import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { transportSchema } from "@/lib/albion/transport";
import { tradeScenarioSchema } from "@/lib/albion/calculations";
import { productionSchema } from "@/lib/albion/production";
export const GET = apiHandler("scenario.list", async (req: NextRequest) => {
  const user = await getServerSession(authOptions);
  if (!user?.user?.id) throw new HttpError(401, "Sign in to load saved scenarios");
  const kind = z
    .enum(["crafting", "refining", "enchanting", "transporting", "flipping"])
    .optional()
    .parse(req.nextUrl.searchParams.get("kind") || undefined);
  return NextResponse.json(
    await db.savedScenario.findMany({
      where: { authorId: user.user.id, ...(kind ? { kind } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, kind: true, configuration: true, updatedAt: true },
    }),
  );
});
export const POST = apiHandler("scenario.save", async (req: NextRequest) => {
  const user = await mutationUser(req);
  if (user.error) return user.error;
  const input = z
    .object({
      title: z.string().trim().min(3).max(100),
      configuration: z.union([productionSchema, transportSchema, tradeScenarioSchema]),
    })
    .parse(await boundedJson(req));
  return NextResponse.json(
    await db.savedScenario.create({
      data: {
        authorId: user.userId!,
        title: input.title,
        kind: input.configuration.kind,
        configuration: input.configuration,
      },
      select: { id: true },
    }),
    { status: 201 },
  );
});
