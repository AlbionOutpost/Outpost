import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, boundedJson, spendSaveBudget } from "@/lib/http";
import { saveComposition } from "@/lib/compositions/service";
import { compositionInput } from "@/lib/compositions/validation";
import { saveSizeLimit, storedBytes } from "@/lib/storage-limits";
export const POST = apiHandler("composition.create", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const input = compositionInput.parse(await boundedJson(req, saveSizeLimit.composition));
  await spendSaveBudget(auth.userId!, storedBytes(input));
  return NextResponse.json(await saveComposition(auth.userId!, input), { status: 201 });
});
