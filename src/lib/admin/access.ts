import { db } from "../db";
import { HttpError } from "../http-error";
import { Prisma } from "../prisma-runtime";
import { accountBanned } from "./policy";
export async function requireAdmin(userId: string, tx: Prisma.TransactionClient = db) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true, bannedAt: true, bannedUntil: true },
  });
  if (!user || user.role !== "ADMIN" || accountBanned(user))
    throw new HttpError(403, "Administrator access required");
}
export async function discordBanned(discordId: string) {
  const ban = await db.discordBan.findUnique({ where: { discordId } });
  return (
    !!ban && !ban.revokedAt && (!ban.expiresAt || new Date(ban.expiresAt).getTime() > Date.now())
  );
}
