// The archive's D1 reads against the real staged library in SQLite: the rewritten queries return
// exactly what the previous ones did, and with 0017_catalog_reads.sql they stay on the listed rows.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeAll, describe, expect, it } from "vitest";
import { archiveFind, archiveList } from "../cloudflare/database/archive";
import { allWeapons, familyWeapons } from "../src/lib/build-discovery";
import type { LibraryQuery } from "../src/lib/grind-library-query";

type Row = Record<string, unknown>;
/** The few D1 calls archive.ts makes, over node:sqlite. */
function d1(db: DatabaseSync) {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => {
        const statement = db.prepare(sql);
        const values = args as (string | number | null)[];
        return {
          all: async () => ({ results: statement.all(...values) as Row[] }),
          first: async () => (statement.get(...values) as Row | undefined) ?? null,
        };
      },
    }),
  } as Parameters<typeof archiveList>[0];
}
/** The rows and manifests scripts/cloudflare-stage-library.mjs stages. */
function stage(db: DatabaseSync) {
  for (const file of ["0001_schema_candidate.sql", "0002_owned_library.sql"])
    db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
  const insert = db.prepare(
    "INSERT INTO OwnedLibrary (kind,id,slug,category,searchText,ordinal,titleOrdinal,payload) VALUES (?,?,?,?,?,?,?,?)",
  );
  const manifest = db.prepare(
    "INSERT INTO OwnedLibraryManifest(kind,checksum,total,categories) VALUES (?,?,?,?)",
  );
  for (const kind of ["builds", "compositions"]) {
    const data = JSON.parse(readFileSync(`public/library/grind-${kind}.json`, "utf8")) as Row[];
    const key = (row: Row) => String(row.id ?? row.slug);
    const titles = new Map(
      [...data]
        .sort((a, b) => String(a.title).localeCompare(String(b.title)))
        .map((row, i) => [key(row), i]),
    );
    db.exec("BEGIN");
    data.forEach((row, ordinal) =>
      insert.run(
        kind,
        key(row),
        String(row.slug),
        String(row.category),
        (kind === "builds"
          ? `${row.title} ${row.weaponName} ${row.author} ${(row.tags as string[]).join(" ")}`
          : `${row.title} ${row.author}`
        ).toLowerCase(),
        ordinal,
        titles.get(key(row))!,
        JSON.stringify(row),
      ),
    );
    const listed =
      kind === "builds"
        ? data.filter((r) => String(r.updatedAt ?? "") >= "2026" && Number(r.upvotes ?? 0) >= 1)
        : data;
    manifest.run(
      kind,
      "fixture",
      listed.length,
      JSON.stringify([...new Set(data.map((r) => r.category))].filter(Boolean).sort()),
    );
    db.exec("COMMIT");
  }
}

/** archiveList and archiveFind as they were before 0017 (one bound-value query shape). */
async function legacyList(db: DatabaseSync, kind: string, input: LibraryQuery) {
  const q = typeof input.q === "string" ? input.q.slice(0, 100).toLowerCase() : "";
  const category = typeof input.category === "string" ? input.category.slice(0, 100) : "";
  const size = kind === "builds" ? 24 : 18;
  const manifest = db
    .prepare("SELECT total, categories FROM OwnedLibraryManifest WHERE kind = ?")
    .get(kind) as { total: number; categories: string };
  let where = "kind = ? AND (? = '' OR category = ?) AND (? = '' OR instr(searchText, ?) > 0)";
  const values: string[] = [kind, category, category, q, q];
  if (kind === "builds") {
    where +=
      " AND json_extract(payload, '$.updatedAt') >= ? AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1";
    values.push("2026");
  }
  const weapon = input.weapon ?? "",
    family = input.family ?? "",
    tag = (input.tag ?? "").toLowerCase();
  if (kind === "builds" && weapon) {
    where += " AND json_extract(payload, '$.weaponName') = ?";
    values.push(weapon);
  }
  if (kind === "builds" && family) {
    if (family === "other") {
      where +=
        " AND coalesce(json_extract(payload, '$.weaponName'), '') NOT IN (SELECT value FROM json_each(?))";
      values.push(JSON.stringify(allWeapons().map((row) => row.name)));
    } else {
      where += " AND json_extract(payload, '$.weaponName') IN (SELECT value FROM json_each(?))";
      values.push(JSON.stringify(familyWeapons(family).map((row) => row.name)));
    }
  }
  if (kind === "builds" && tag) {
    where +=
      " AND EXISTS (SELECT 1 FROM json_each(OwnedLibrary.payload, '$.tags') WHERE lower(value) = ?)";
    values.push(tag);
  }
  const matched =
    q || category || weapon || family || tag
      ? (
          db.prepare(`SELECT COUNT(*) AS n FROM OwnedLibrary WHERE ${where}`).get(...values) as {
            n: number;
          }
        ).n
      : manifest.total;
  const pages = Math.max(1, Math.ceil(matched / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(input.page)) || 1));
  const order =
    input.sort === "title"
      ? "titleOrdinal"
      : input.sort === "newest" && kind === "builds"
        ? "julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal"
        : "coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal";
  const rows = db
    .prepare(`SELECT payload FROM OwnedLibrary WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...values, size, (page - 1) * size) as { payload: string }[];
  return {
    rows: rows.map((row) => JSON.parse(row.payload)),
    total: manifest.total,
    matched,
    categories: JSON.parse(manifest.categories),
    page,
    pages,
  };
}

const before = new DatabaseSync(":memory:"),
  after = new DatabaseSync(":memory:");
const plan = (sql: string) =>
  (after.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as { detail: string }[])
    .map((row) => row.detail)
    .join(" | ");
const listed =
  "kind = 'builds' AND json_extract(payload, '$.updatedAt') >= '2026' AND coalesce(json_extract(payload, '$.upvotes'), 0) >= 1";

beforeAll(() => {
  stage(before);
  stage(after);
  after.exec(readFileSync("cloudflare/d1/migrations/0017_catalog_reads.sql", "utf8"));
}, 60_000);

describe("archive reads on the staged library", () => {
  const builds: LibraryQuery[] = [
    { page: 1 },
    { page: 20 },
    { page: 999 },
    { page: Number.POSITIVE_INFINITY },
    { sort: "newest", page: 30 },
    { sort: "title", page: 3 },
    { q: "mist" },
    { q: "mist", page: 99 },
    { q: "a", page: 2 },
    { q: "zzzz-nothing" },
    { q: "bloodletter", sort: "newest" },
    { category: "ZVZ" },
    { category: "ZVZ", sort: "newest", page: 3 },
    { category: "ZVZ", q: "hallowfall" },
    { weapon: "Claymore" },
    { weapon: "Incubus Mace", page: 2 },
    { family: "sword" },
    { family: "other" },
    { tag: "pvp" },
    { tag: "PvP", page: 2 },
    { tag: "roaming", q: "staff" },
    { tag: "no-such-tag" },
  ];
  const compositions: LibraryQuery[] = [
    { page: 1 },
    { page: 10 },
    { sort: "title", page: 2 },
    { q: "zvz" },
    { q: "zvz", page: 2 },
    { category: "SMALL_SCALE" },
    { category: "SMALL_SCALE", q: "a", page: 3 },
  ];
  it("lists exactly the same pages, counts and clamped page numbers as before", async () => {
    for (const [kind, inputs] of [
      ["builds", builds],
      ["compositions", compositions],
    ] as const)
      for (const input of inputs)
        expect(
          JSON.stringify(await archiveList(d1(after), kind, input)),
          JSON.stringify(input),
        ).toBe(JSON.stringify(await legacyList(before, kind, input)));
  });

  it("finds the same rows by id or slug, newest first, and skips unknown keys", async () => {
    const all = after.prepare("SELECT id, slug FROM OwnedLibrary WHERE kind = 'builds'").all() as {
      id: string;
      slug: string;
    }[];
    const keys = [...all.slice(0, 50).map((r) => r.slug), all[60].id, "missing-build"];
    const found = (await archiveFind(d1(after), "builds", keys)) as { slug: string }[];
    // References go in batches of 40, each in the newest-first order the old scan returned.
    const expected = [keys.slice(0, 40), keys.slice(40)].flatMap((batch) => {
      const marks = batch.map(() => "?").join(",");
      return (
        before
          .prepare(
            `SELECT slug FROM OwnedLibrary WHERE kind = 'builds' AND (id IN (${marks}) OR slug IN (${marks})) ORDER BY julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal`,
          )
          .all(...batch, ...batch) as { slug: string }[]
      ).map((r) => r.slug);
    });
    expect(found.map((r) => r.slug)).toEqual(expected);
    expect(found).toHaveLength(51);
  });

  it("reads listed builds through the partial indexes, never the whole archive", () => {
    expect(
      plan(
        `SELECT payload FROM OwnedLibrary WHERE ${listed} ORDER BY coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal LIMIT 24`,
      ),
    ).toContain("OwnedLibrary_listed_likes");
    expect(
      plan(`SELECT COUNT(*) FROM OwnedLibrary WHERE ${listed} AND instr(searchText, 'mist') > 0`),
    ).toContain("OwnedLibrary_listed_likes");
    expect(
      plan(
        `SELECT payload FROM OwnedLibrary WHERE ${listed} AND json_extract(payload, '$.weaponName') = 'Claymore' ORDER BY coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal LIMIT 24`,
      ),
    ).toContain("OwnedLibrary_listed_weapon");
    expect(
      plan(
        `SELECT payload FROM OwnedLibrary WHERE ${listed} AND category = 'ZVZ' ORDER BY coalesce(json_extract(payload, '$.upvotes'), 0) DESC, ordinal LIMIT 24`,
      ),
    ).toContain("OwnedLibrary_listed_category");
    expect(
      plan(
        `SELECT payload FROM OwnedLibrary WHERE ${listed} ORDER BY julianday(json_extract(payload, '$.updatedAt')) DESC, ordinal LIMIT 24`,
      ),
    ).toContain("OwnedLibrary_listed_newest");
    expect(
      plan(
        "SELECT payload FROM OwnedLibrary WHERE kind = 'compositions' ORDER BY titleOrdinal LIMIT 18",
      ),
    ).toContain("OwnedLibrary_comps_title");
    for (const index of [
      "OwnedLibrary_likes",
      "OwnedLibrary_newest",
      "OwnedLibrary_title",
      "OwnedLibrary_order",
    ])
      expect(
        after.prepare("SELECT name FROM sqlite_master WHERE name = ?").get(index),
      ).toBeUndefined();
  });
});
