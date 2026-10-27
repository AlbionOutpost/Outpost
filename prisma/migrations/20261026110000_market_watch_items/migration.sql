-- Additive only. Existing user data and migration history are preserved.
CREATE TABLE "MarketWatchItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quality" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketWatchItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketWatchItem_region_check" CHECK ("region" IN ('americas','europe','asia')),
  CONSTRAINT "MarketWatchItem_quality_check" CHECK ("quality" BETWEEN 1 AND 5),
  CONSTRAINT "MarketWatchItem_itemId_check" CHECK (length("itemId") <= 100 AND "itemId" ~ '^T[1-8]_[A-Z0-9_]+(@[1-4])?$'),
  CONSTRAINT "MarketWatchItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MarketWatchItem_userId_region_itemId_quality_key" ON "MarketWatchItem"("userId","region","itemId","quality");
