-- Additive private-store upgrade: Team crest, what the team plays and its recruiting state.
ALTER TABLE "Group" ADD COLUMN "crestItem" TEXT;
ALTER TABLE "Group" ADD COLUMN "crestColor" TEXT;
ALTER TABLE "Group" ADD COLUMN "activities" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN "recruiting" BOOLEAN NOT NULL DEFAULT true;
