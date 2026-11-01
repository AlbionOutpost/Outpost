-- Additive team ledger. Existing groups, events, builds and versions are retained.
CREATE TABLE "GroupLootSplit" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "configuration" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupLootSplit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GroupLootSplit_version_valid" CHECK ("version" >= 1),
  CONSTRAINT "GroupLootSplit_title_length" CHECK (length("title") BETWEEN 3 AND 100)
);
CREATE INDEX "GroupLootSplit_groupId_updatedAt_idx" ON "GroupLootSplit"("groupId", "updatedAt");
ALTER TABLE "GroupLootSplit" ADD CONSTRAINT "GroupLootSplit_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupLootSplit" ADD CONSTRAINT "GroupLootSplit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
