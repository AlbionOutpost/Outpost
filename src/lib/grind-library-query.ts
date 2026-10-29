import { weaponFamily } from "./build-discovery";
export type LibraryQuery = {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  weapon?: string;
  family?: string;
  tag?: string;
};
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
    updatedAt?: string;
  },
>(rows: T[], query: LibraryQuery, size: number): LibraryPage<T> {
  const q = (query.q ?? "").toLowerCase();
  const matches = rows.filter(
    (row) =>
      (!query.category || row.category === query.category) &&
      (!query.weapon || row.weaponName === query.weapon) &&
      (!query.family || weaponFamily(row.weaponName) === query.family) &&
      (!query.tag || row.tags?.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) &&
      `${row.title} ${"weaponName" in row ? (row.weaponName ?? "") + " " : ""}${row.author}${row.tags ? " " + row.tags.join(" ") : ""}`
        .toLowerCase()
        .includes(q),
  );
  if (query.sort === "title") matches.sort((a, b) => a.title.localeCompare(b.title));
  if (query.sort === "newest")
    matches.sort(
      (a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0),
    );
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
