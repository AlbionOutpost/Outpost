import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { mutationUser, boundedJson } from "@/lib/http";
import { requireRead, saveComposition, groupRole } from "@/lib/compositions/service";
import { canManageMembers, canEditShared } from "@/lib/groups/permissions";
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
  await db.$transaction(async (tx) => {
    const row = await requireRead(id, auth.userId, tx);
    const role = row.groupId ? await groupRole(tx, row.groupId, auth.userId) : null;
    const permitted =
      row.visibility === "GROUP"
        ? (row.authorId === auth.userId && canEditShared(role)) || canManageMembers(role)
        : row.authorId === auth.userId;
    if (!permitted) throw new HttpError(403, "You cannot delete this composition");
    await tx.composition.delete({ where: { id } });
  });
  return new NextResponse(null, { status: 204 });
});
