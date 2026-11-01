-- CreateTable
CREATE TABLE "Timer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "durationMs" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3),
    "remainingMs" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Timer_userId_updatedAt_idx" ON "Timer"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
