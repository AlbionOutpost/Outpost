import { NextRequest, NextResponse } from "next/server";
import { buildInput } from "@/lib/builds/validation";
import { createBuild } from "@/lib/builds/service";
import { mutationUser, boundedJson, spendSaveBudget } from "@/lib/http";
import { apiHandler } from "@/lib/api-errors";
import { storedBytes } from "@/lib/storage-limits";
export const POST = apiHandler("build.create", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const parsed = buildInput.parse(await boundedJson(req));
  await spendSaveBudget(auth.userId!, storedBytes(parsed));
  return NextResponse.json(await createBuild(auth.userId!, parsed), { status: 201 });
});
