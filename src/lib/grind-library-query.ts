export type LibraryQuery = { q?: string; category?: string; sort?: string; page?: number };
export type LibraryPage<T> = {
  rows: T[];
  total: number;
  matched: number;
  categories: string[];
  page: number;
  pages: number;
};
export function paginateLibrary<
  T extends {
    title: string;
    author: string;
    category: string;
    weaponName?: string;
    tags?: string[];
  },
>(rows: T[], query: LibraryQuery, size: number): LibraryPage<T> {
  const q = (query.q ?? "").toLowerCase();
  const matches = rows.filter(
    (row) =>
      (!query.category || row.category === query.category) &&
      `${row.title} ${"weaponName" in row ? (row.weaponName ?? "") + " " : ""}${row.author}${row.tags ? " " + row.tags.join(" ") : ""}`
        .toLowerCase()
        .includes(q),
  );
  if (query.sort === "title") matches.sort((a, b) => a.title.localeCompare(b.title));
  const pages = Math.max(1, Math.ceil(matches.length / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(query.page ?? 1) || 1));
  return {
    rows: matches.slice((page - 1) * size, page * size),
    total: rows.length,
    matched: matches.length,
    categories: [...new Set(rows.map((row) => row.category))].filter(Boolean).sort(),
    page,
    pages,
  };
}
