-- CreateTable
CREATE TABLE "SavedScenario" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedScenario_authorId_updatedAt_idx" ON "SavedScenario"("authorId", "updatedAt");

-- AddForeignKey
ALTER TABLE "SavedScenario" ADD CONSTRAINT "SavedScenario_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
