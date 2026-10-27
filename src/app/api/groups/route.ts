import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { regionSchema } from "@/lib/albion/region-config";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
const input = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(60),
  description: z.string().trim().max(4000),
  region: regionSchema,
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
});
export const POST = apiHandler("group.create", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const data = input.parse(await boundedJson(req));
  if (await db.group.findUnique({ where: { slug: data.slug }, select: { id: true } }))
    throw new HttpError(409, "That group address is already in use");
  const group = await db.group.create({
    data: {
      ...data,
      ownerId: auth.userId!,
      members: { create: { userId: auth.userId!, role: "OWNER" } },
    },
    select: { id: true, slug: true },
  });
  return NextResponse.json(group, { status: 201 });
});
