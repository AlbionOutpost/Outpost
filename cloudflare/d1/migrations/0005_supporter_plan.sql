-- Additive, idempotent upgrade: the Supporter plan on the account record.
ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN "planStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "planRenewsAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
