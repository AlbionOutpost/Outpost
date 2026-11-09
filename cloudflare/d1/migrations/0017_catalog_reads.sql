-- Read indexes for the public D1 catalog only (item metadata and the owned library archive). The
-- private store never holds these rows, so the OutpostDatabase constructor does not run this file.
-- Applied by scripts/cloudflare-library-upvotes.mjs (the "Library data" workflow) and the local
-- staging scripts. Idempotent. Deploy the matching data Worker first: archiveList writes the
-- listed-build and kind terms as literals so SQLite can match these partial indexes.

-- The library lists builds updated in 2026 and liked at least once (src/lib/library-scope.ts):
-- about 1.4 k of 10.8 k stored builds. Partial indexes hold only those rows, so a count or a page
-- reads the listed set (or one weapon's or one activity's share of it), never every stored build.
-- They replace the kind-wide order indexes from 0002, which made SQLite walk unlisted builds.
DROP INDEX IF EXISTS OwnedLibrary_likes;
DROP INDEX IF EXISTS OwnedLibrary_newest;
DROP INDEX IF EXISTS OwnedLibrary_title;
DROP INDEX IF EXISTS OwnedLibrary_order;
CREATE INDEX IF NOT EXISTS OwnedLibrary_listed_likes ON OwnedLibrary(kind, coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal) WHERE kind = 'builds' AND json_extract(payload, '$.updatedAt') >= '2026' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1;
CREATE INDEX IF NOT EXISTS OwnedLibrary_listed_category ON OwnedLibrary(kind, category, coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal) WHERE kind = 'builds' AND json_extract(payload, '$.updatedAt') >= '2026' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1;
CREATE INDEX IF NOT EXISTS OwnedLibrary_listed_weapon ON OwnedLibrary(kind, json_extract(payload, '$.weaponName'), coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal) WHERE kind = 'builds' AND json_extract(payload, '$.updatedAt') >= '2026' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1;
CREATE INDEX IF NOT EXISTS OwnedLibrary_listed_newest ON OwnedLibrary(kind, julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal) WHERE kind = 'builds' AND json_extract(payload, '$.updatedAt') >= '2026' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1;
CREATE INDEX IF NOT EXISTS OwnedLibrary_listed_title ON OwnedLibrary(kind, titleOrdinal) WHERE kind = 'builds' AND json_extract(payload, '$.updatedAt') >= '2026' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1;
-- Every stored comp is listed.
CREATE INDEX IF NOT EXISTS OwnedLibrary_comps_likes ON OwnedLibrary(kind, coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal) WHERE kind = 'compositions';
CREATE INDEX IF NOT EXISTS OwnedLibrary_comps_category ON OwnedLibrary(kind, category, coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal) WHERE kind = 'compositions';
CREATE INDEX IF NOT EXISTS OwnedLibrary_comps_title ON OwnedLibrary(kind, titleOrdinal) WHERE kind = 'compositions';

-- Item database pages: tier bands in (tier, enchantment, id) order, covering the listed columns,
-- so a page stops after its rows and a name filter reads the index instead of the table. Neither
-- item index starts with "active" (every staged row is active), so a slot lookup keeps using
-- ItemMetadata_active_slot_tier_idx.
CREATE INDEX IF NOT EXISTS ItemMetadata_catalog_order ON "ItemMetadata"("tier", "enchantment", "id", "name", "slot", "active");
-- Site search: one enchantment level in id order (the order rows are staged in), covering, so the
-- first 120 matches are read from the index alone.
CREATE INDEX IF NOT EXISTS ItemMetadata_search ON "ItemMetadata"("enchantment", "id", "name", "tier", "slot", "active");

-- Statistics for the new indexes, as D1 recommends after creating indexes.
PRAGMA optimize;
