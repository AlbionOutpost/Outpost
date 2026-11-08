-- Account saves: library build favorites and specialization levels kept on the account when
-- signed in (guests keep them in the browser). Additive; nothing existing changes.
CREATE TABLE "LibraryFavorite" (
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryFavorite_pkey" PRIMARY KEY ("userId","slug"),
    CONSTRAINT "LibraryFavorite_slug_valid" CHECK ("slug" ~ '^[a-z0-9][a-z0-9-]{0,199}$')
);

CREATE TABLE "MasteryLevel" (
    "userId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasteryLevel_pkey" PRIMARY KEY ("userId","specId"),
    CONSTRAINT "MasteryLevel_specId_valid" CHECK ("specId" ~ '^[a-z0-9_]{1,80}$'),
    CONSTRAINT "MasteryLevel_level_valid" CHECK ("level" BETWEEN 1 AND 100)
);

ALTER TABLE "LibraryFavorite" ADD CONSTRAINT "LibraryFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MasteryLevel" ADD CONSTRAINT "MasteryLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
