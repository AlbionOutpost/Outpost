import type { LibraryBuild, LibraryComposition } from "../../src/lib/grind-library-types";
import type { LibraryQuery, LibraryPage } from "../../src/lib/grind-library-query";
import { HttpError } from "../../src/lib/http-error";
import { allWeapons, familyWeapons } from "../../src/lib/build-discovery";
import { LISTED_SINCE } from "../../src/lib/library-scope";

/** The part of a D1 binding these reads use (typed here so Node tests can supply SQLite). */
type Catalog = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
};
const kindCheck = (kind: string) => {
  if (!["builds", "compositions"].includes(kind))
    throw new HttpError(400, "Unknown archive collection");
};
export async function archiveList(
  binding: Catalog,
  kind: string,
  input: LibraryQuery,
): Promise<LibraryPage<LibraryBuild | LibraryComposition>> {
  kindCheck(kind);
  const q = typeof input.q === "string" ? input.q.slice(0, 100).toLowerCase() : "";
  const category = typeof input.category === "string" ? input.category.slice(0, 100) : "";
  const size = kind === "builds" ? 24 : 18;
  const manifest = await binding
    .prepare("SELECT total, categories FROM OwnedLibraryManifest WHERE kind = ?")
    .bind(kind)
    .first<{ total: number; categories: string }>();
  if (!manifest) throw new Error("Reviewed archive is not staged");
  // The kind (checked above) and the listed-build scope (src/lib/library-scope.ts: updated in
  // 2026 and liked at least once) are literals, not bound values, so SQLite matches the partial
  // indexes in cloudflare/d1/migrations/0017_catalog_reads.sql and reads only listed rows.
  // Unlisted builds stay stored for the comps that reference them; the manifest total is the
  // listed count. Only filters in use become terms, so an index can serve each one.
  const terms = [`kind = '${kind}'`];
  const values: unknown[] = [];
  if (kind === "builds")
    terms.push(
      `json_extract(payload, '$.updatedAt') >= '${LISTED_SINCE}' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1`,
    );
  if (category) {
    terms.push("category = ?");
    values.push(category);
  }
  if (q) {
    terms.push("instr(searchText, ?) > 0");
    values.push(q);
  }
  const weapon = typeof input.weapon === "string" ? input.weapon.slice(0, 100) : "";
  const family = typeof input.family === "string" ? input.family.slice(0, 100) : "";
  const tag = typeof input.tag === "string" ? input.tag.slice(0, 100).toLowerCase() : "";
  if (kind === "builds" && weapon) {
    terms.push("json_extract(payload, '$.weaponName') = ?");
    values.push(weapon);
  }
  if (kind === "builds" && family) {
    // Names travel as one JSON parameter (D1 caps bound parameters at 100). "Other" matches what
    // weaponFamily() maps there locally: any weapon missing from the discovery index, or none.
    if (family === "other") {
      terms.push(
        "coalesce(json_extract(payload, '$.weaponName'), '') NOT IN (SELECT value FROM json_each(?))",
      );
      values.push(JSON.stringify(allWeapons().map((row) => row.name)));
    } else {
      terms.push("json_extract(payload, '$.weaponName') IN (SELECT value FROM json_each(?))");
      values.push(JSON.stringify(familyWeapons(family).map((row) => row.name)));
    }
  }
  if (kind === "builds" && tag) {
    // searchText ends with the lower-cased tags, so a build without the tag in it is skipped from
    // the index before its payload is opened. The exact tag test still decides.
    terms.push(
      "instr(searchText, ?) > 0 AND EXISTS (SELECT 1 FROM json_each(OwnedLibrary.payload, '$.tags') WHERE lower(value) = ?)",
    );
    values.push(tag, tag);
  }
  const where = terms.join(" AND ");
  const order =
    input.sort === "title"
      ? "titleOrdinal"
      : input.sort === "newest" && kind === "builds"
        ? "julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal"
        : "coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal";
  const select = (page: number) =>
    binding
      .prepare(`SELECT payload FROM OwnedLibrary WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .bind(...values, size, (page - 1) * size)
      .all<{ payload: string }>();
  const requested = Math.max(1, Math.trunc(Number(input.page)) || 1);
  const filtered = q || category || weapon || family || tag;
  // A short first page is the whole match, so a search that fits on it needs no separate count.
  const first = filtered && requested === 1 ? await select(1) : null;
  const matched = !filtered
    ? manifest.total
    : first && first.results.length < size
      ? first.results.length
      : (await binding
          .prepare(`SELECT COUNT(*) AS n FROM OwnedLibrary WHERE ${where}`)
          .bind(...values)
          .first<{ n: number }>())!.n;
  const pages = Math.max(1, Math.ceil(matched / size));
  const page = Math.min(pages, requested);
  const result = first ?? (await select(page));
  return {
    rows: result.results.map((row) => JSON.parse(row.payload)),
    total: manifest.total,
    matched,
    categories: JSON.parse(manifest.categories),
    page,
    pages,
  };
}
/** Listed totals per collection straight from the manifest: two rows read, no payload scan. */
export async function archiveTotals(binding: Catalog): Promise<Record<string, number>> {
  const result = await binding
    .prepare("SELECT kind, total FROM OwnedLibraryManifest")
    .bind()
    .all<{ kind: string; total: number }>();
  const totals = Object.fromEntries(result.results.map((row) => [row.kind, row.total]));
  if (typeof totals.builds !== "number" || typeof totals.compositions !== "number")
    throw new Error("Reviewed archive is not staged");
  return totals;
}
export async function archiveFind(
  binding: Catalog,
  kind: string,
  keys: string[],
): Promise<(LibraryBuild | LibraryComposition)[]> {
  kindCheck(kind);
  if (
    !Array.isArray(keys) ||
    keys.length > 500 ||
    keys.some((key) => typeof key !== "string" || key.length > 200)
  )
    throw new HttpError(400, "Invalid archive references");
  const unique = [...new Set(keys)];
  const results: (LibraryBuild | LibraryComposition)[] = [];
  // D1 permits 100 bound parameters. Batch references, preserving duplicate roster slots in the UI.
  // Two index lookups joined by UNION: one "id IN … OR slug IN …" makes SQLite scan every row of
  // the kind. Rows come newest first, the order that scan returned them in.
  for (let start = 0; start < unique.length; start += 40) {
    const ids = unique.slice(start, start + 40),
      placeholders = ids.map(() => "?").join(","),
      lookup = (column: string) =>
        `SELECT julianday(json_extract(payload, '$.updatedAt')) AS updated, ordinal, payload FROM OwnedLibrary WHERE kind = ? AND ${column} IN (${placeholders})`;
    const rows = await binding
      .prepare(`${lookup("id")} UNION ${lookup("slug")} ORDER BY updated DESC, ordinal`)
      .bind(kind, ...ids, kind, ...ids)
      .all<{ payload: string }>();
    results.push(...rows.results.map((row) => JSON.parse(row.payload)));
  }
  return results;
}
