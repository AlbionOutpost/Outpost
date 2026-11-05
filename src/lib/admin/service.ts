import { db, databaseService } from "../db";
import { Prisma } from "../prisma-runtime";
import { HttpError } from "../http-error";
import { retrySerialization } from "../serialization-retry";
import { requireAdmin } from "./access";
import { userAction, banAction, type UserAction, type BanAction } from "./validation";
async function localAdminUserAction(actorId: string, targetId: string, input: UserAction) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(targetId)) throw new HttpError(400, "Invalid account ID");
  const value = userAction.parse(input);
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        await requireAdmin(actorId, tx);
        const user = await tx.user.findUnique({ where: { id: targetId } });
        if (!user) throw new HttpError(404, "Account not found");
        if (user.updatedAt.toISOString() !== value.expectedUpdatedAt)
          throw new HttpError(409, "This account changed. Refresh before trying again.");
        if (value.action === "revoke-sessions" && (actorId === targetId || user.role === "ADMIN"))
          throw new HttpError(
            400,
            "Administrator sessions cannot be revoked here. Use Sign out for your own session.",
          );
        const revision = new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1));
        const data =
          value.action === "grant"
            ? {
                supporterGiftPermanent: value.days === 0,
                supporterGiftUntil: value.days
                  ? new Date(Date.now() + value.days * 86400000)
                  : null,
              }
            : value.action === "revoke-gift"
              ? { supporterGiftPermanent: false, supporterGiftUntil: null }
              : {};
        const updated = await tx.user.updateMany({
          where: { id: targetId, updatedAt: user.updatedAt },
          data: { ...data, updatedAt: revision },
        });
        if (!updated.count)
          throw new HttpError(409, "This account changed. Refresh before trying again.");
        if (value.action === "revoke-sessions")
          await tx.session.deleteMany({ where: { userId: targetId } });
        await tx.adminAudit.create({
          data: {
            actorId,
            targetId,
            action:
              value.action === "grant"
                ? `grant-supporter-${value.days || "until-revoked"}${value.days ? "-days" : ""}`
                : value.action,
            reason: value.reason,
          },
        });
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
export const adminUserAction: typeof localAdminUserAction = (...args) =>
  databaseService("adminUserAction", args) ?? localAdminUserAction(...args);
async function localAdminBanAction(actorId: string, input: BanAction) {
  const value = banAction.parse(input);
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        await requireAdmin(actorId, tx);
        const accounts = await tx.account.findMany({
          where: { provider: "discord", providerAccountId: value.discordId },
          select: { user: { select: { id: true, role: true } } },
        });
        if (
          value.discordId === process.env.OUTPOST_OWNER_DISCORD_ID ||
          accounts.some((a) => a.user.id === actorId || a.user.role === "ADMIN")
        )
          throw new HttpError(403, "The owner and administrator accounts cannot be banned here.");
        const previous = await tx.discordBan.findUnique({ where: { discordId: value.discordId } });
        if ((previous?.version ?? 0) !== value.version)
          throw new HttpError(409, "This ban changed. Refresh before trying again.");
        const now = new Date(),
          expiresAt = value.days ? new Date(now.getTime() + value.days * 86400000) : null;
        if (value.action === "unban") {
          if (!previous || previous.revokedAt)
            throw new HttpError(409, "There is no active ban to revoke.");
          await tx.discordBan.update({
            where: { discordId: value.discordId, version: value.version },
            data: { revokedAt: now, version: { increment: 1 } },
          });
        } else if (previous) {
          await tx.discordBan.update({
            where: { discordId: value.discordId, version: value.version },
            data: {
              reason: value.reason,
              createdById: actorId,
              createdAt: now,
              expiresAt,
              revokedAt: null,
              version: { increment: 1 },
            },
          });
        } else
          await tx.discordBan.create({
            data: {
              discordId: value.discordId,
              reason: value.reason,
              createdById: actorId,
              expiresAt,
            },
          });
        const ids = accounts.map((a) => a.user.id);
        if (ids.length) {
          await tx.user.updateMany({
            where: { id: { in: ids } },
            data: {
              bannedAt: value.action === "ban" ? now : null,
              bannedUntil: value.action === "ban" ? expiresAt : null,
              updatedAt: now,
            },
          });
          await tx.session.deleteMany({ where: { userId: { in: ids } } });
        }
        await tx.adminAudit.create({
          data: { actorId, targetId: value.discordId, action: value.action, reason: value.reason },
        });
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
export const adminBanAction: typeof localAdminBanAction = (...args) =>
  databaseService("adminBanAction", args) ?? localAdminBanAction(...args);
