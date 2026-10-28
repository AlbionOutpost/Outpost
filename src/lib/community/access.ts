import { Prisma } from "@/lib/prisma-runtime";
import { db } from "../db";
import { HttpError } from "../http-error";
import type { z } from "zod";
import { targetKind } from "./validation";
export async function requireModerator(userId: string, client: Prisma.TransactionClient = db) {
  const u = await client.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u || !["ADMIN", "MODERATOR"].includes(u.role))
    throw new HttpError(403, "Moderator access required");
}
export async function communityTarget(
  kind: z.infer<typeof targetKind>,
  id: string,
  userId?: string,
  client: Prisma.TransactionClient = db,
) {
  if (kind === "build") {
    const b = await client.build.findUnique({
      where: { id },
      select: { id: true, authorId: true, title: true, visibility: true, hiddenAt: true },
    });
    if (!b || ((b.visibility === "PRIVATE" || b.hiddenAt) && b.authorId !== userId))
      throw new HttpError(404, "Content not found");
    return b;
  }
  const c = await client.composition.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      title: true,
      visibility: true,
      groupId: true,
      hiddenAt: true,
    },
  });
  if (!c || (c.hiddenAt && c.authorId !== userId)) throw new HttpError(404, "Content not found");
  if (c.visibility === "PUBLIC" || (c.visibility === "PRIVATE" && c.authorId === userId)) return c;
  if (
    c.visibility === "GROUP" &&
    userId &&
    c.groupId &&
    (await client.groupMember.findUnique({
      where: { groupId_userId: { groupId: c.groupId, userId } },
    }))
  )
    return c;
  throw new HttpError(404, "Content not found");
}
