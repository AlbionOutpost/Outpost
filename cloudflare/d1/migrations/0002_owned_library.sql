-- Additive public owner-content archive. No private accounts, builds or entitlements.
CREATE TABLE IF NOT EXISTS OwnedLibrary (
  kind TEXT NOT NULL CHECK(kind IN ('builds', 'compositions')),
  id TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL,
  searchText TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  titleOrdinal INTEGER NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(kind, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS OwnedLibrary_slug ON OwnedLibrary(kind, slug);
CREATE INDEX IF NOT EXISTS OwnedLibrary_order ON OwnedLibrary(kind, ordinal);
CREATE INDEX IF NOT EXISTS OwnedLibrary_title ON OwnedLibrary(kind, titleOrdinal);
-- Expression indexes matching archiveList's default and newest ORDER BY exactly, so a page walks
-- the index and stops at LIMIT instead of scanning and sorting every payload.
CREATE INDEX IF NOT EXISTS OwnedLibrary_likes ON OwnedLibrary(kind, coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal);
CREATE INDEX IF NOT EXISTS OwnedLibrary_newest ON OwnedLibrary(kind, julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal);
CREATE TABLE IF NOT EXISTS OwnedLibraryManifest (
  kind TEXT NOT NULL PRIMARY KEY CHECK(kind IN ('builds', 'compositions')),
  checksum TEXT NOT NULL,
  total INTEGER NOT NULL,
  categories TEXT NOT NULL CHECK(json_valid(categories))
);
