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
CREATE TABLE IF NOT EXISTS OwnedLibraryManifest (
  kind TEXT NOT NULL PRIMARY KEY CHECK(kind IN ('builds', 'compositions')),
  checksum TEXT NOT NULL,
  total INTEGER NOT NULL,
  categories TEXT NOT NULL CHECK(json_valid(categories))
);
