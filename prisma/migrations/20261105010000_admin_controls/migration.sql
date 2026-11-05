ALTER TABLE "User" ADD COLUMN "supporterGiftUntil" TIMESTAMP(3), ADD COLUMN "supporterGiftPermanent" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "bannedAt" TIMESTAMP(3), ADD COLUMN "bannedUntil" TIMESTAMP(3);
CREATE TABLE "DiscordBan" ("discordId" TEXT NOT NULL PRIMARY KEY, "reason" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1);
CREATE TABLE "AdminAudit" ("id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT NOT NULL, "targetId" TEXT NOT NULL, "action" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");
CREATE INDEX "AdminAudit_targetId_createdAt_idx" ON "AdminAudit"("targetId", "createdAt");
ALTER TABLE "DiscordBan" ADD CONSTRAINT "DiscordBan_version_check" CHECK ("version" > 0);
