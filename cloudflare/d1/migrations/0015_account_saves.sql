-- Additive private-store upgrade: account saves (Postgres 20261110090000_account_saves). Library
-- build favorites and specialization levels kept on the account when signed in; guests keep
-- them in the browser. New tables only; nothing existing changes. BEFORE triggers enforce the
-- same key format and 1-100 level rule as the Postgres CHECKs.
CREATE TABLE IF NOT EXISTS "LibraryFavorite" (
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "slug"),
    CONSTRAINT "LibraryFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MasteryLevel" (
    "userId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("userId", "specId"),
    CONSTRAINT "MasteryLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TRIGGER IF NOT EXISTS "LibraryFavorite_domain_insert" BEFORE INSERT ON "LibraryFavorite"
WHEN NOT (length(NEW."slug") BETWEEN 1 AND 200 AND NEW."slug" NOT GLOB '*[^a-z0-9-]*' AND substr(NEW."slug", 1, 1) <> '-')
BEGIN SELECT RAISE(ABORT, 'LibraryFavorite_domain'); END;
CREATE TRIGGER IF NOT EXISTS "LibraryFavorite_domain_update" BEFORE UPDATE ON "LibraryFavorite"
WHEN NOT (length(NEW."slug") BETWEEN 1 AND 200 AND NEW."slug" NOT GLOB '*[^a-z0-9-]*' AND substr(NEW."slug", 1, 1) <> '-')
BEGIN SELECT RAISE(ABORT, 'LibraryFavorite_domain'); END;
CREATE TRIGGER IF NOT EXISTS "MasteryLevel_domain_insert" BEFORE INSERT ON "MasteryLevel"
WHEN NOT (length(NEW."specId") BETWEEN 1 AND 80 AND NEW."specId" NOT GLOB '*[^a-z0-9_]*' AND typeof(NEW."level") = 'integer' AND NEW."level" BETWEEN 1 AND 100)
BEGIN SELECT RAISE(ABORT, 'MasteryLevel_domain'); END;
CREATE TRIGGER IF NOT EXISTS "MasteryLevel_domain_update" BEFORE UPDATE ON "MasteryLevel"
WHEN NOT (length(NEW."specId") BETWEEN 1 AND 80 AND NEW."specId" NOT GLOB '*[^a-z0-9_]*' AND typeof(NEW."level") = 'integer' AND NEW."level" BETWEEN 1 AND 100)
BEGIN SELECT RAISE(ABORT, 'MasteryLevel_domain'); END;
