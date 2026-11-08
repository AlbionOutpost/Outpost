-- Additive private-store upgrade: giveaways (Postgres 20261111090000_giveaways). Site-wide ones run
-- by Outpost staff (no team) and a Team's own, open to its members. One entry per player (the
-- primary key); the server draws the winners once, after entries close. SQLite cannot add CHECKs
-- to a table later, so BEFORE triggers enforce the Postgres rules, and also freeze a giveaway and
-- its entries once it is drawn or cancelled: the winner list never changes after the draw.
-- Roles that can manage the team get the new "Manage giveaways" permission (bit 1024).
CREATE TABLE IF NOT EXISTS "Giveaway" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT,
    "title" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "image" TEXT,
    "region" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '',
    "winnerCount" INTEGER NOT NULL,
    "closesAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "drawnById" TEXT,
    "drawnAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Giveaway_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Giveaway_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Giveaway_drawnById_fkey" FOREIGN KEY ("drawnById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "GiveawayEntry" (
    "giveawayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "winnerPosition" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("giveawayId", "userId"),
    CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GiveawayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Giveaway_groupId_status_closesAt_idx" ON "Giveaway"("groupId", "status", "closesAt");
CREATE INDEX IF NOT EXISTS "Giveaway_status_closesAt_idx" ON "Giveaway"("status", "closesAt");
CREATE INDEX IF NOT EXISTS "GiveawayEntry_userId_idx" ON "GiveawayEntry"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "GiveawayEntry_giveawayId_winnerPosition_key" ON "GiveawayEntry"("giveawayId", "winnerPosition");
CREATE TRIGGER IF NOT EXISTS "Giveaway_domain_insert" BEFORE INSERT ON "Giveaway"
WHEN NOT (length(NEW."title") BETWEEN 3 AND 100 AND length(NEW."prize") BETWEEN 1 AND 500 AND length(NEW."rules") <= 4000 AND (NEW."image" IS NULL OR length(NEW."image") BETWEEN 1 AND 40) AND NEW."region" IN ('europe','americas','asia') AND NEW."winnerCount" BETWEEN 1 AND 50 AND NEW."version" >= 1 AND NEW."status" IN ('OPEN','CANCELLED','DRAWN') AND (NEW."status" = 'DRAWN') = (NEW."drawnAt" IS NOT NULL) AND (NEW."status" = 'CANCELLED') = (NEW."cancelledAt" IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'Giveaway_domain'); END;
CREATE TRIGGER IF NOT EXISTS "Giveaway_domain_update" BEFORE UPDATE ON "Giveaway"
WHEN NOT (length(NEW."title") BETWEEN 3 AND 100 AND length(NEW."prize") BETWEEN 1 AND 500 AND length(NEW."rules") <= 4000 AND (NEW."image" IS NULL OR length(NEW."image") BETWEEN 1 AND 40) AND NEW."region" IN ('europe','americas','asia') AND NEW."winnerCount" BETWEEN 1 AND 50 AND NEW."version" >= 1 AND NEW."status" IN ('OPEN','CANCELLED','DRAWN') AND (NEW."status" = 'DRAWN') = (NEW."drawnAt" IS NOT NULL) AND (NEW."status" = 'CANCELLED') = (NEW."cancelledAt" IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'Giveaway_domain'); END;
-- A drawn or cancelled giveaway is final. Only the creator/drawer links may still clear (an
-- account deletion sets them to NULL).
CREATE TRIGGER IF NOT EXISTS "Giveaway_final" BEFORE UPDATE ON "Giveaway"
WHEN OLD."status" <> 'OPEN' AND (NEW."status" IS NOT OLD."status" OR NEW."groupId" IS NOT OLD."groupId" OR NEW."title" IS NOT OLD."title" OR NEW."prize" IS NOT OLD."prize" OR NEW."image" IS NOT OLD."image" OR NEW."region" IS NOT OLD."region" OR NEW."rules" IS NOT OLD."rules" OR NEW."winnerCount" IS NOT OLD."winnerCount" OR NEW."closesAt" IS NOT OLD."closesAt" OR NEW."drawnAt" IS NOT OLD."drawnAt" OR NEW."cancelledAt" IS NOT OLD."cancelledAt" OR (NEW."createdById" IS NOT OLD."createdById" AND NEW."createdById" IS NOT NULL) OR (NEW."drawnById" IS NOT OLD."drawnById" AND NEW."drawnById" IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'Giveaway_final'); END;
-- Entries are added only while the giveaway is open, never as winners.
CREATE TRIGGER IF NOT EXISTS "GiveawayEntry_insert_open" BEFORE INSERT ON "GiveawayEntry"
WHEN NEW."winnerPosition" IS NOT NULL OR (SELECT "status" FROM "Giveaway" WHERE "id" = NEW."giveawayId") IS NOT 'OPEN'
BEGIN SELECT RAISE(ABORT, 'GiveawayEntry_closed'); END;
-- The draw marks winners while the giveaway is still open, then closes it in the same
-- transaction; after that no entry changes, and a place once drawn is never moved.
CREATE TRIGGER IF NOT EXISTS "GiveawayEntry_winner_once" BEFORE UPDATE ON "GiveawayEntry"
WHEN NEW."giveawayId" IS NOT OLD."giveawayId" OR NEW."userId" IS NOT OLD."userId" OR OLD."winnerPosition" IS NOT NULL OR (NEW."winnerPosition" IS NOT NULL AND NEW."winnerPosition" NOT BETWEEN 1 AND 50) OR (SELECT "status" FROM "Giveaway" WHERE "id" = NEW."giveawayId") IS NOT 'OPEN'
BEGIN SELECT RAISE(ABORT, 'GiveawayEntry_winner_once'); END;
-- Widen the role permission bound to eleven flags, then give Manage giveaways to Manage team holders.
DROP TRIGGER IF EXISTS "GroupCustomRole_domain_insert";
DROP TRIGGER IF EXISTS "GroupCustomRole_domain_update";
UPDATE "GroupCustomRole" SET "permissions" = "permissions" | 1024 WHERE ("permissions" & 1) <> 0;
CREATE TRIGGER IF NOT EXISTS "GroupCustomRole_domain_insert" BEFORE INSERT ON "GroupCustomRole"
WHEN NOT (length(NEW."name") BETWEEN 1 AND 32 AND NEW."color" IN ('muted','ember','gold','green','teal','blue','violet','red') AND NEW."permissions" BETWEEN 0 AND 2047)
BEGIN SELECT RAISE(ABORT, 'GroupCustomRole_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupCustomRole_domain_update" BEFORE UPDATE ON "GroupCustomRole"
WHEN NOT (length(NEW."name") BETWEEN 1 AND 32 AND NEW."color" IN ('muted','ember','gold','green','teal','blue','violet','red') AND NEW."permissions" BETWEEN 0 AND 2047)
BEGIN SELECT RAISE(ABORT, 'GroupCustomRole_domain'); END;
