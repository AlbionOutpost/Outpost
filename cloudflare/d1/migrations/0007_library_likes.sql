-- Additive account likes; existing content and archived votes remain unchanged.
CREATE TABLE "LibraryLike" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('build','composition')),
 "slug" TEXT NOT NULL CHECK (length("slug") BETWEEN 1 AND 200),
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LibraryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LibraryLike_userId_kind_slug_key" ON "LibraryLike"("userId", "kind", "slug");
CREATE INDEX "LibraryLike_kind_slug_idx" ON "LibraryLike"("kind", "slug");
