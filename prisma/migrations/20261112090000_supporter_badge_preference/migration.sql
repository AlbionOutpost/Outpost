-- Additive profile field: whether the public Supporter badge shows beside the name. Existing
-- accounts keep it on (owner, 9 Nov 2026: optional, on by default).
ALTER TABLE "User" ADD COLUMN "showSupporterBadge" BOOLEAN NOT NULL DEFAULT true;
