import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { transportSchema, transport } from "@/lib/albion/transport";
import { tradeScenarioSchema } from "@/lib/albion/calculations";
import { productionSchema, production } from "@/lib/albion/production";
import { productionPlanSchema, productionPlan } from "@/lib/albion/production-plan";
import { savedShoppingSchema } from "@/lib/albion/shopping";
import { farmingSchema, farming } from "@/lib/albion/farming";
export const GET = apiHandler("scenario.list", async (req: NextRequest) => {
  const user = await getServerSession(authOptions);
  if (!user?.user?.id) throw new HttpError(401, "Sign in to load saved scenarios");
  const kind = z
    .enum([
      "crafting",
      "refining",
      "enchanting",
      "transporting",
      "flipping",
      "production-plan",
      "farming",
      "shopping-list",
    ])
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
      configuration: z.union([
        productionSchema,
        transportSchema,
        tradeScenarioSchema,
        productionPlanSchema,
        farmingSchema,
        savedShoppingSchema,
      ]),
    })
    .parse(await boundedJson(req));
  try {
    if (input.configuration.kind === "transporting") transport(input.configuration);
    if (["crafting", "refining", "enchanting"].includes(input.configuration.kind))
      production(productionSchema.parse(input.configuration));
  } catch {
    throw new HttpError(400, "Scenario inputs or totals exceed supported limits");
  }
  if (input.configuration.kind === "production-plan") {
    try {
      productionPlan(input.configuration);
    } catch {
      throw new HttpError(400, "Plan inputs or totals exceed supported limits");
    }
  }
  if (input.configuration.kind === "farming") {
    try {
      farming(input.configuration);
    } catch {
      throw new HttpError(400, "Farming inputs or totals exceed supported limits");
    }
  }
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
