import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildInput } from "@/lib/builds/validation";
import { mutationUser, boundedJson } from "@/lib/http";
import { apiHandler } from "@/lib/api-errors";
export const POST = apiHandler("build.create", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const parsed = buildInput.parse(await boundedJson(req));
  const { equipment, ...data } = parsed;
  const result = await db.build.create({
    data: {
      ...data,
      authorId: auth.userId!,
      equipment: { create: equipment },
      versions: { create: { version: 1, snapshot: parsed } },
    },
    select: { id: true, version: true },
  });
  return NextResponse.json(result, { status: 201 });
});
