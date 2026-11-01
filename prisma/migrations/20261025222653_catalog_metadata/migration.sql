-- CreateTable
CREATE TABLE "CatalogRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rightsReference" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemCount" INTEGER NOT NULL,

    CONSTRAINT "CatalogRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMetadata" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "enchantment" INTEGER NOT NULL,
    "itemPower" INTEGER,
    "abilities" JSONB NOT NULL,
    "recipe" JSONB,
    "releaseId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogRelease_version_key" ON "CatalogRelease"("version");

-- CreateIndex
CREATE INDEX "ItemMetadata_active_slot_tier_idx" ON "ItemMetadata"("active", "slot", "tier");

-- CreateIndex
CREATE INDEX "ItemMetadata_name_idx" ON "ItemMetadata"("name");

-- AddForeignKey
ALTER TABLE "ItemMetadata" ADD CONSTRAINT "ItemMetadata_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "CatalogRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
