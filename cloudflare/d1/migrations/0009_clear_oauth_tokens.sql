-- Data-only private-store upgrade: Outpost never calls Discord for a player, so provider tokens
-- persisted before linkAccount stopped storing them are cleared. No schema change.
UPDATE "Account" SET "access_token" = NULL, "refresh_token" = NULL, "id_token" = NULL WHERE "access_token" IS NOT NULL OR "refresh_token" IS NOT NULL OR "id_token" IS NOT NULL;
