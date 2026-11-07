-- Team economy: a silver ledger per team (member balances and the team pot), coin flips and loot
-- rolls decided on the server. In-game silver bookkeeping only; nothing here is real money.
CREATE TABLE "GroupWalletEntry" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupWalletEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GroupWalletEntry_amount_valid" CHECK ("amount" <> 0 AND "amount" = trunc("amount") AND abs("amount") <= 1000000000000),
    CONSTRAINT "GroupWalletEntry_kind_valid" CHECK ("kind" IN ('credit','debit','payout','reset','split','roll','flip')),
    CONSTRAINT "GroupWalletEntry_text_length" CHECK (length("reason") BETWEEN 1 AND 200 AND length("sourceId") BETWEEN 1 AND 120)
);

CREATE TABLE "GroupCoinFlip" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdById" TEXT,
    "headsId" TEXT NOT NULL,
    "tailsId" TEXT,
    "call" TEXT,
    "stake" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "rollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "GroupCoinFlip_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GroupCoinFlip_state_valid" CHECK ("status" IN ('PENDING','SETTLED','DECLINED','CANCELLED') AND ("status" = 'SETTLED') = ("outcome" IS NOT NULL) AND ("outcome" IS NULL OR "outcome" IN ('heads','tails'))),
    CONSTRAINT "GroupCoinFlip_sides_valid" CHECK (length("key") BETWEEN 8 AND 64 AND ("call" IS NULL OR "call" IN ('heads','tails')) AND ("tailsId" IS NULL) = ("call" IS NOT NULL) AND ("tailsId" IS NULL OR "tailsId" <> "headsId")),
    CONSTRAINT "GroupCoinFlip_stake_valid" CHECK ("stake" >= 0 AND "stake" = trunc("stake") AND "stake" <= 1000000000000 AND ("stake" = 0 OR "tailsId" IS NOT NULL))
);

CREATE TABLE "GroupLootRoll" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "silver" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "potShare" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "winnerId" TEXT,
    "tieBreak" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "GroupLootRoll_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GroupLootRoll_domain" CHECK (length("key") BETWEEN 8 AND 64 AND length("title") BETWEEN 1 AND 100 AND "status" IN ('OPEN','CLOSED','CANCELLED') AND "silver" >= 0 AND "silver" = trunc("silver") AND "silver" <= 1000000000000)
);

CREATE TABLE "GroupLootRollEntry" (
    "rollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupLootRollEntry_pkey" PRIMARY KEY ("rollId","userId"),
    CONSTRAINT "GroupLootRollEntry_value_valid" CHECK ("value" BETWEEN 1 AND 100)
);

CREATE INDEX "GroupWalletEntry_groupId_userId_createdAt_idx" ON "GroupWalletEntry"("groupId", "userId", "createdAt");

CREATE INDEX "GroupWalletEntry_groupId_createdAt_idx" ON "GroupWalletEntry"("groupId", "createdAt");

CREATE UNIQUE INDEX "GroupWalletEntry_groupId_sourceId_userId_key" ON "GroupWalletEntry"("groupId", "sourceId", "userId");

CREATE INDEX "GroupCoinFlip_groupId_createdAt_idx" ON "GroupCoinFlip"("groupId", "createdAt");

CREATE UNIQUE INDEX "GroupCoinFlip_groupId_key_key" ON "GroupCoinFlip"("groupId", "key");

CREATE INDEX "GroupLootRoll_groupId_createdAt_idx" ON "GroupLootRoll"("groupId", "createdAt");

CREATE UNIQUE INDEX "GroupLootRoll_groupId_key_key" ON "GroupLootRoll"("groupId", "key");

ALTER TABLE "GroupWalletEntry" ADD CONSTRAINT "GroupWalletEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupWalletEntry" ADD CONSTRAINT "GroupWalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupWalletEntry" ADD CONSTRAINT "GroupWalletEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupCoinFlip" ADD CONSTRAINT "GroupCoinFlip_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupCoinFlip" ADD CONSTRAINT "GroupCoinFlip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupCoinFlip" ADD CONSTRAINT "GroupCoinFlip_headsId_fkey" FOREIGN KEY ("headsId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupCoinFlip" ADD CONSTRAINT "GroupCoinFlip_tailsId_fkey" FOREIGN KEY ("tailsId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupLootRoll" ADD CONSTRAINT "GroupLootRoll_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupLootRoll" ADD CONSTRAINT "GroupLootRoll_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupLootRoll" ADD CONSTRAINT "GroupLootRoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupLootRollEntry" ADD CONSTRAINT "GroupLootRollEntry_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "GroupLootRoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupLootRollEntry" ADD CONSTRAINT "GroupLootRollEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A new "Manage wallet" role permission (bit 512). Roles that could manage loot splits get it, so
-- nobody gains access they did not effectively have: whoever recorded payouts now books them.
ALTER TABLE "GroupCustomRole" DROP CONSTRAINT "GroupCustomRole_permissions_valid";
ALTER TABLE "GroupCustomRole" ADD CONSTRAINT "GroupCustomRole_permissions_valid" CHECK ("permissions" BETWEEN 0 AND 1023);
UPDATE "GroupCustomRole" SET "permissions" = "permissions" | 512 WHERE ("permissions" & 128) <> 0;
