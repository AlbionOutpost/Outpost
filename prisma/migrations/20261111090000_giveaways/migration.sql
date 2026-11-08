-- Giveaways: site-wide ones run by Outpost staff (no team) and a Team's own, open to its members.
-- One entry per player per giveaway (the primary key); the server draws the winners once, after
-- entries close, and records when and who drew. Nothing here is real money: prizes are in game.
CREATE TABLE "Giveaway" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "title" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "image" TEXT,
    "region" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '',
    "winnerCount" INTEGER NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "drawnById" TEXT,
    "drawnAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Giveaway_domain" CHECK (length("title") BETWEEN 3 AND 100 AND length("prize") BETWEEN 1 AND 500 AND length("rules") <= 4000 AND ("image" IS NULL OR length("image") BETWEEN 1 AND 40) AND "region" IN ('europe','americas','asia') AND "winnerCount" BETWEEN 1 AND 50 AND "version" >= 1),
    CONSTRAINT "Giveaway_state" CHECK ("status" IN ('OPEN','CANCELLED','DRAWN') AND ("status" = 'DRAWN') = ("drawnAt" IS NOT NULL) AND ("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL))
);

CREATE TABLE "GiveawayEntry" (
    "giveawayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "winnerPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayEntry_pkey" PRIMARY KEY ("giveawayId","userId"),
    CONSTRAINT "GiveawayEntry_winner_valid" CHECK ("winnerPosition" IS NULL OR "winnerPosition" BETWEEN 1 AND 50)
);

CREATE INDEX "Giveaway_groupId_status_closesAt_idx" ON "Giveaway"("groupId", "status", "closesAt");

CREATE INDEX "Giveaway_status_closesAt_idx" ON "Giveaway"("status", "closesAt");

CREATE INDEX "GiveawayEntry_userId_idx" ON "GiveawayEntry"("userId");

CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_winnerPosition_key" ON "GiveawayEntry"("giveawayId", "winnerPosition");

ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_drawnById_fkey" FOREIGN KEY ("drawnById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GiveawayEntry" ADD CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GiveawayEntry" ADD CONSTRAINT "GiveawayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A new "Manage giveaways" role permission (bit 1024). Roles that can manage the team get it, so
-- nobody gains access they did not effectively have; the owner holds every permission anyway.
ALTER TABLE "GroupCustomRole" DROP CONSTRAINT "GroupCustomRole_permissions_valid";
ALTER TABLE "GroupCustomRole" ADD CONSTRAINT "GroupCustomRole_permissions_valid" CHECK ("permissions" BETWEEN 0 AND 2047);
UPDATE "GroupCustomRole" SET "permissions" = "permissions" | 1024 WHERE ("permissions" & 1) <> 0;
