-- Additive private-store upgrade. Historical migrations remain immutable.
ALTER TABLE "User" ADD COLUMN "supporterGiftUntil" DATETIME;
ALTER TABLE "User" ADD COLUMN "supporterGiftPermanent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "bannedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "bannedUntil" DATETIME;
CREATE TABLE "DiscordBan" ("discordId" TEXT NOT NULL PRIMARY KEY, "reason" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" DATETIME, "revokedAt" DATETIME, "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0));
CREATE TABLE "AdminAudit" ("id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT NOT NULL, "targetId" TEXT NOT NULL, "action" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");
CREATE INDEX "AdminAudit_targetId_createdAt_idx" ON "AdminAudit"("targetId", "createdAt");
