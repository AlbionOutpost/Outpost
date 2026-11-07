-- Additive Team profile fields: crest, what the team plays and whether it takes join requests.
ALTER TABLE "Group" ADD COLUMN "crestItem" TEXT, ADD COLUMN "crestColor" TEXT, ADD COLUMN "activities" TEXT NOT NULL DEFAULT '', ADD COLUMN "recruiting" BOOLEAN NOT NULL DEFAULT true;
