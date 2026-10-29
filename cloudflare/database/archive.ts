import type { LibraryBuild, LibraryComposition } from "../../src/lib/grind-library-types";
import type { LibraryQuery, LibraryPage } from "../../src/lib/grind-library-query";
import { HttpError } from "../../src/lib/http-error";
import { familyWeapons } from "../../src/lib/build-discovery";

const kindCheck = (kind: string) => {
  if (!["builds", "compositions"].includes(kind))
    throw new HttpError(400, "Unknown archive collection");
};
export async function archiveList(
  binding: D1Database,
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
  let where = "kind = ? AND (? = '' OR category = ?) AND (? = '' OR instr(searchText, ?) > 0)";
  const values = [kind, category, category, q, q];
  const weapon = typeof input.weapon === "string" ? input.weapon.slice(0, 100) : "";
  const family = typeof input.family === "string" ? input.family.slice(0, 100) : "";
  const tag = typeof input.tag === "string" ? input.tag.slice(0, 100).toLowerCase() : "";
  if (kind === "builds" && weapon) {
    where += " AND json_extract(payload, '$.weaponName') = ?";
    values.push(weapon);
  }
  if (kind === "builds" && family) {
    const names = familyWeapons(family).map((row) => row.name);
    if (family === "other") {
      const known = familyWeapons("other").map((row) => row.name);
      where += known.length
        ? ` AND (json_extract(payload, '$.weaponName') IN (${known.map(() => "?").join(",")}) OR coalesce(json_extract(payload, '$.weaponName'), '') = '')`
        : " AND coalesce(json_extract(payload, '$.weaponName'), '') = ''";
      values.push(...known);
    } else {
      where += names.length
        ? ` AND json_extract(payload, '$.weaponName') IN (${names.map(() => "?").join(",")})`
        : " AND 0";
      values.push(...names);
    }
  }
  if (kind === "builds" && tag) {
    where +=
      " AND EXISTS (SELECT 1 FROM json_each(OwnedLibrary.payload, '$.tags') WHERE lower(value) = ?)";
    values.push(tag);
  }
  const matched =
    q || category || weapon || family || tag
      ? (await binding
          .prepare(`SELECT COUNT(*) AS n FROM OwnedLibrary WHERE ${where}`)
          .bind(...values)
          .first<{ n: number }>())!.n
      : manifest.total;
  const pages = Math.max(1, Math.ceil(matched / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(input.page)) || 1));
  const order =
    input.sort === "title"
      ? "titleOrdinal"
      : input.sort === "newest" && kind === "builds"
        ? "julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal"
        : "ordinal";
  const result = await binding
    .prepare(`SELECT payload FROM OwnedLibrary WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(...values, size, (page - 1) * size)
    .all<{ payload: string }>();
  return {
    rows: result.results.map((row) => JSON.parse(row.payload)),
    total: manifest.total,
    matched,
    categories: JSON.parse(manifest.categories),
    page,
    pages,
  };
}
export async function archiveFind(
  binding: D1Database,
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
  for (let start = 0; start < unique.length; start += 40) {
    const ids = unique.slice(start, start + 40),
      placeholders = ids.map(() => "?").join(",");
    const rows = await binding
      .prepare(
        `SELECT payload FROM OwnedLibrary WHERE kind = ? AND (id IN (${placeholders}) OR slug IN (${placeholders}))`,
      )
      .bind(kind, ...ids, ...ids)
      .all<{ payload: string }>();
    results.push(...rows.results.map((row) => JSON.parse(row.payload)));
  }
  return results;
}
