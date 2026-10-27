-- CreateEnum
CREATE TYPE "BuildVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "visibility" "BuildVisibility" NOT NULL DEFAULT 'PRIVATE',
    "playerCount" INTEGER NOT NULL DEFAULT 1,
    "recommendedIP" INTEGER NOT NULL DEFAULT 0,
    "strategy" TEXT NOT NULL,
    "patchNotes" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildEquipment" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "abilities" TEXT NOT NULL,
    "alternatives" TEXT NOT NULL,

    CONSTRAINT "BuildEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildVersion" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Build_visibility_updatedAt_idx" ON "Build"("visibility", "updatedAt");

-- CreateIndex
CREATE INDEX "Build_authorId_updatedAt_idx" ON "Build"("authorId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuildEquipment_buildId_slot_key" ON "BuildEquipment"("buildId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "BuildVersion_buildId_version_key" ON "BuildVersion"("buildId", "version");

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEquipment" ADD CONSTRAINT "BuildEquipment_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildVersion" ADD CONSTRAINT "BuildVersion_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;
