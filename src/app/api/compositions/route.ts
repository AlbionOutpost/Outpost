import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { saveComposition } from "@/lib/compositions/service";
export const POST = apiHandler("composition.create", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  return NextResponse.json(await saveComposition(auth.userId!, await boundedJson(req, 1048576)), {
    status: 201,
  });
});
