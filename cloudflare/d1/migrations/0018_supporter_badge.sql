-- Additive private-store upgrade (Postgres 20261112090000_supporter_badge_preference): whether
-- the public Supporter badge shows beside the name. Existing accounts keep it on.
ALTER TABLE "User" ADD COLUMN "showSupporterBadge" BOOLEAN NOT NULL DEFAULT true;
