import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { requireRead, saveComposition, deleteComposition } from "@/lib/compositions/service";
import { compositionInput } from "@/lib/compositions/validation";
type Context = { params: Promise<{ id: string }> };
export const GET = apiHandler("composition.read", async (_req: NextRequest, ctx: Context) => {
  const session = await getServerSession(authOptions);
  return NextResponse.json(await requireRead((await ctx.params).id, session?.user?.id));
});
export const PUT = apiHandler("composition.update", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const body = z
    .object({ version: z.number().int().positive(), composition: compositionInput })
    .parse(await boundedJson(req, 1048576));
  return NextResponse.json(
    await saveComposition(auth.userId!, body.composition, (await ctx.params).id, body.version),
  );
});
export const DELETE = apiHandler("composition.delete", async (req: NextRequest, ctx: Context) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const id = (await ctx.params).id;
  await deleteComposition(id, auth.userId!);
  return new NextResponse(null, { status: 204 });
});
