-- Additive private-store upgrade: the Team economy (Postgres 20261108090000_team_economy). A silver
-- ledger per team (member balances and the team pot), coin flips and loot rolls decided on the
-- server (flips carry no stake and never move silver). In-game silver bookkeeping only. Roles
-- that could manage loot splits get the new "Manage wallet" permission (bit 512), so nobody
-- gains access they did not effectively have.
CREATE TABLE IF NOT EXISTS "GroupWalletEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" REAL NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupWalletEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupWalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupWalletEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "GroupCoinFlip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdById" TEXT,
    "headsId" TEXT NOT NULL,
    "tailsId" TEXT,
    "call" TEXT,
    "outcome" TEXT NOT NULL,
    "rollId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupCoinFlip_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupCoinFlip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GroupCoinFlip_headsId_fkey" FOREIGN KEY ("headsId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupCoinFlip_tailsId_fkey" FOREIGN KEY ("tailsId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "GroupLootRoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "silver" REAL NOT NULL DEFAULT 0,
    "potShare" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "winnerId" TEXT,
    "tieBreak" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "GroupLootRoll_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupLootRoll_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GroupLootRoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "GroupLootRollEntry" (
    "rollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("rollId", "userId"),
    CONSTRAINT "GroupLootRollEntry_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "GroupLootRoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupLootRollEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "GroupWalletEntry_groupId_userId_createdAt_idx" ON "GroupWalletEntry"("groupId", "userId", "createdAt");
CREATE INDEX IF NOT EXISTS "GroupWalletEntry_groupId_createdAt_idx" ON "GroupWalletEntry"("groupId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupWalletEntry_groupId_sourceId_userId_key" ON "GroupWalletEntry"("groupId", "sourceId", "userId");
CREATE INDEX IF NOT EXISTS "GroupCoinFlip_groupId_createdAt_idx" ON "GroupCoinFlip"("groupId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupCoinFlip_groupId_key_key" ON "GroupCoinFlip"("groupId", "key");
CREATE INDEX IF NOT EXISTS "GroupLootRoll_groupId_createdAt_idx" ON "GroupLootRoll"("groupId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupLootRoll_groupId_key_key" ON "GroupLootRoll"("groupId", "key");
CREATE TRIGGER IF NOT EXISTS "GroupWalletEntry_domain_insert" BEFORE INSERT ON "GroupWalletEntry"
WHEN NOT (NEW."amount" <> 0 AND NEW."amount" = CAST(NEW."amount" AS INTEGER) AND abs(NEW."amount") <= 1000000000000 AND NEW."kind" IN ('credit','debit','payout','reset','split','roll') AND length(NEW."reason") BETWEEN 1 AND 200 AND length(NEW."sourceId") BETWEEN 1 AND 120)
BEGIN SELECT RAISE(ABORT, 'GroupWalletEntry_domain'); END;
-- Ledger entries are append-only: a correction is a new entry, never an edit.
CREATE TRIGGER IF NOT EXISTS "GroupWalletEntry_append_only" BEFORE UPDATE ON "GroupWalletEntry"
WHEN NEW."amount" IS NOT OLD."amount" OR NEW."userId" IS NOT OLD."userId" OR NEW."groupId" IS NOT OLD."groupId" OR NEW."sourceId" IS NOT OLD."sourceId" OR NEW."kind" IS NOT OLD."kind"
BEGIN SELECT RAISE(ABORT, 'GroupWalletEntry_append_only'); END;
CREATE TRIGGER IF NOT EXISTS "GroupCoinFlip_domain_insert" BEFORE INSERT ON "GroupCoinFlip"
WHEN NOT (NEW."outcome" IN ('heads','tails') AND length(NEW."key") BETWEEN 8 AND 64 AND (NEW."call" IS NULL OR NEW."call" IN ('heads','tails')) AND (NEW."tailsId" IS NULL) = (NEW."call" IS NOT NULL) AND (NEW."tailsId" IS NULL OR NEW."tailsId" <> NEW."headsId"))
BEGIN SELECT RAISE(ABORT, 'GroupCoinFlip_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupLootRoll_domain_insert" BEFORE INSERT ON "GroupLootRoll"
WHEN NOT (length(NEW."key") BETWEEN 8 AND 64 AND length(NEW."title") BETWEEN 1 AND 100 AND NEW."status" IN ('OPEN','CLOSED','CANCELLED') AND NEW."silver" >= 0 AND NEW."silver" = CAST(NEW."silver" AS INTEGER) AND NEW."silver" <= 1000000000000)
BEGIN SELECT RAISE(ABORT, 'GroupLootRoll_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupLootRoll_domain_update" BEFORE UPDATE ON "GroupLootRoll"
WHEN NOT (length(NEW."key") BETWEEN 8 AND 64 AND length(NEW."title") BETWEEN 1 AND 100 AND NEW."status" IN ('OPEN','CLOSED','CANCELLED') AND NEW."silver" >= 0 AND NEW."silver" = CAST(NEW."silver" AS INTEGER) AND NEW."silver" <= 1000000000000)
BEGIN SELECT RAISE(ABORT, 'GroupLootRoll_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupLootRollEntry_domain_insert" BEFORE INSERT ON "GroupLootRollEntry"
WHEN NOT (NEW."value" BETWEEN 1 AND 100)
BEGIN SELECT RAISE(ABORT, 'GroupLootRollEntry_domain'); END;
-- Widen the role permission bound to ten flags, then give Manage wallet to Manage loot holders.
DROP TRIGGER IF EXISTS "GroupCustomRole_domain_insert";
DROP TRIGGER IF EXISTS "GroupCustomRole_domain_update";
UPDATE "GroupCustomRole" SET "permissions" = "permissions" | 512 WHERE ("permissions" & 128) <> 0;
CREATE TRIGGER IF NOT EXISTS "GroupCustomRole_domain_insert" BEFORE INSERT ON "GroupCustomRole"
WHEN NOT (length(NEW."name") BETWEEN 1 AND 32 AND NEW."color" IN ('muted','ember','gold','green','teal','blue','violet','red') AND NEW."permissions" BETWEEN 0 AND 1023)
BEGIN SELECT RAISE(ABORT, 'GroupCustomRole_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupCustomRole_domain_update" BEFORE UPDATE ON "GroupCustomRole"
WHEN NOT (length(NEW."name") BETWEEN 1 AND 32 AND NEW."color" IN ('muted','ember','gold','green','teal','blue','violet','red') AND NEW."permissions" BETWEEN 0 AND 1023)
BEGIN SELECT RAISE(ABORT, 'GroupCustomRole_domain'); END;
