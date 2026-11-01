-- Additive, idempotent upgrade for existing SQLite coordination databases.
CREATE TABLE IF NOT EXISTS "GroupLootSplit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "title" TEXT NOT NULL CHECK(length("title") BETWEEN 3 AND 100),
  "configuration" TEXT NOT NULL CHECK(json_valid("configuration")),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK("version" >= 1),
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GroupLootSplit_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupLootSplit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "GroupLootSplit_groupId_updatedAt_idx" ON "GroupLootSplit"("groupId", "updatedAt");
CREATE TRIGGER IF NOT EXISTS "GroupLootSplit_domain_insert" BEFORE INSERT ON "GroupLootSplit"
WHEN NOT (NEW."version" >= 1 AND length(NEW."title") BETWEEN 3 AND 100 AND json_valid(NEW."configuration"))
BEGIN SELECT RAISE(ABORT, 'GroupLootSplit_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupLootSplit_domain_update" BEFORE UPDATE ON "GroupLootSplit"
WHEN NOT (NEW."version" >= 1 AND length(NEW."title") BETWEEN 3 AND 100 AND json_valid(NEW."configuration"))
BEGIN SELECT RAISE(ABORT, 'GroupLootSplit_domain'); END;
