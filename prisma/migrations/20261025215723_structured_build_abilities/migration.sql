-- AlterTable
ALTER TABLE "BuildEquipment" ADD COLUMN     "abilitySelections" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "alternativeItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
