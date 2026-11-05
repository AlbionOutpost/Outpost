-- Data-only: clear Discord provider tokens stored before linkAccount stopped persisting them.
UPDATE "Account" SET "access_token" = NULL, "refresh_token" = NULL, "id_token" = NULL WHERE "access_token" IS NOT NULL OR "refresh_token" IS NOT NULL OR "id_token" IS NOT NULL;
