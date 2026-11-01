import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";

const folder = ".qa/cloudflare-library";
mkdirSync(folder, { recursive: true });
const source = ["builds", "compositions"].map((kind) => {
  const data = JSON.parse(readFileSync(`public/library/grind-${kind}.json`, "utf8"));
  const titleOrder = new Map(
    [...data]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((row, i) => [row.id ?? row.slug, i]),
  );
  const checksum = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return {
    kind,
    checksum,
    categories: [...new Set(data.map((row) => row.category))].filter(Boolean).sort(),
    // The manifest total is what the library lists (src/lib/library-scope.ts); every row is
    // still stored because comps reference unlisted builds.
    total:
      kind === "builds"
        ? data.filter((row) => (row.updatedAt ?? "") >= "2026" && (row.upvotes ?? 0) >= 1).length
        : data.length,
    rows: data.map((row, ordinal) => ({
      kind,
      id: row.id ?? row.slug,
      slug: row.slug,
      category: row.category,
      searchText: (kind === "builds"
        ? `${row.title} ${row.weaponName} ${row.author} ${row.tags.join(" ")}`
        : `${row.title} ${row.author}`
      ).toLowerCase(),
      ordinal,
      titleOrdinal: titleOrder.get(row.id ?? row.slug),
      payload: JSON.stringify(row),
    })),
  };
});
const checksum = createHash("sha256")
  .update(JSON.stringify(source.map(({ kind, checksum }) => ({ kind, checksum }))))
  .digest("hex");
const converted = spawnSync(
  "python3",
  [
    "-c",
    `
import json,sqlite3,sys
source=json.load(sys.stdin);db=sqlite3.connect(':memory:');out=[]
names=['kind','id','slug','category','searchText','ordinal','titleOrdinal','payload']
prefix='INSERT OR IGNORE INTO OwnedLibrary ('+','.join(names)+') VALUES '
rows=[];size=len(prefix)
for collection in source:
 for record in collection['rows']:
  values=db.execute('SELECT '+','.join(['quote(?)']*len(names)),[record[n] for n in names]).fetchone()
  row='('+','.join(map(str,values))+')'
  if len(row.encode())>80000:raise ValueError('Archive entry exceeds statement budget')
  if rows and (size+len(row.encode())>85000 or len(rows)>=40):out.append(prefix+','.join(rows)+';');rows=[];size=len(prefix)
  rows.append(row);size+=len(row.encode())+1
if rows:out.append(prefix+','.join(rows)+';')
manifests=[]
for collection in source:
 values=db.execute('SELECT quote(?),quote(?),quote(?),quote(?)',[collection['kind'],collection['checksum'],collection['total'],json.dumps(collection['categories'],separators=(',',':'))]).fetchone()
 manifests.append('INSERT OR REPLACE INTO OwnedLibraryManifest(kind,checksum,total,categories) VALUES ('+','.join(map(str,values))+');')
print(json.dumps({'statements':out,'manifests':manifests}))
`,
  ],
  { input: JSON.stringify(source), encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
if (converted.status !== 0) throw new Error("Owned public library SQL preparation failed");
const prepared = JSON.parse(converted.stdout);
const statements = prepared.statements;
const counts = Object.fromEntries(source.map(({ kind, rows }) => [kind, rows.length]));
writeFileSync(
  `${folder}/prepared-summary.json`,
  JSON.stringify(
    { checksum, counts, statements: statements.length, privateRecordsExported: false },
    null,
    2,
  ),
);
if (process.argv.includes("--write-local")) {
  writeFileSync(
    `${folder}/local-import.sql`,
    readFileSync("cloudflare/d1/migrations/0002_owned_library.sql", "utf8") +
      "\n" +
      statements.join("\n") +
      "\n" +
      prepared.manifests.join("\n"),
  );
}
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ prepared: true, counts, remoteWrites: false }));
  process.exit(0);
}

const { accountId } = loadCloudflareCredentials();
const target = JSON.parse(readFileSync(".qa/cloudflare-launch/d1-target.json", "utf8"));
if (target.name !== "albionoutpost-staging" || !/^[a-f0-9-]{36}$/.test(target.databaseId))
  throw new Error("Unexpected public staging target");
const base = `/accounts/${accountId}/d1/database/${target.databaseId}`;
if ((await api("GET", base)).result.name !== target.name)
  throw new Error("Staging identity mismatch");
let rowsWritten = 0;
const query = async (sql, params) => {
  const response = await api("POST", `${base}/query`, { sql, ...(params ? { params } : {}) });
  for (const row of response.result ?? []) {
    if (!row.success) throw new Error("Library database statement failed");
    rowsWritten += row.meta?.rows_written ?? 0;
  }
  if (rowsWritten > 60_000)
    throw new Error("Library import write budget exceeded; stop and inspect");
  return response.result;
};
await query(readFileSync("cloudflare/d1/migrations/0002_owned_library.sql", "utf8"));
await query(
  "CREATE TABLE IF NOT EXISTS _outpost_library_import (id INTEGER PRIMARY KEY CHECK(id = 1), checksum TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0)",
);
const marker = (
  await query("SELECT checksum, completed FROM _outpost_library_import WHERE id = 1")
)[0].results[0];
if (marker && marker.checksum !== checksum)
  throw new Error("A different archive is staged; use an explicit reviewed migration");
if (!marker) {
  const existing = (await query("SELECT COUNT(*) AS n FROM OwnedLibrary"))[0].results[0].n;
  if (existing) throw new Error("Unrecognized archive rows; refusing to overwrite");
  await query("INSERT INTO _outpost_library_import (id, checksum) VALUES (1, ?)", [checksum]);
}
if (!marker?.completed) {
  for (let start = 0; start < statements.length; start += 5)
    await query(statements.slice(start, start + 5).join("\n"));
  for (const collection of source) {
    const actual = (
      await query("SELECT COUNT(*) AS n FROM OwnedLibrary WHERE kind = ?", [collection.kind])
    )[0].results[0].n;
    if (actual !== collection.rows.length) throw new Error("Library row count mismatch");
    await query(
      "INSERT INTO OwnedLibraryManifest(kind,checksum,total,categories) VALUES (?,?,?,?) ON CONFLICT(kind) DO UPDATE SET checksum=excluded.checksum,total=excluded.total,categories=excluded.categories",
      [
        collection.kind,
        collection.checksum,
        collection.rows.length,
        JSON.stringify(collection.categories),
      ],
    );
  }
  await query("UPDATE _outpost_library_import SET completed = 1 WHERE id = 1");
}
const manifests = (
  await query("SELECT kind, checksum, total FROM OwnedLibraryManifest ORDER BY kind")
)[0].results;
for (const collection of source) {
  const manifest = manifests.find((row) => row.kind === collection.kind);
  if (
    !manifest ||
    manifest.checksum !== collection.checksum ||
    manifest.total !== collection.rows.length
  )
    throw new Error("Library manifest mismatch");
  // Exact full payload read-back for both ends of each immutable collection.
  for (const expected of [collection.rows[0], collection.rows.at(-1)]) {
    const row = (
      await query("SELECT payload FROM OwnedLibrary WHERE kind = ? AND id = ?", [
        collection.kind,
        expected.id,
      ])
    )[0].results[0];
    if (row?.payload !== expected.payload) throw new Error("Library payload read-back mismatch");
  }
}
const users = (await query('SELECT COUNT(*) AS n FROM "User"'))[0].results[0].n;
if (users !== 0) throw new Error("Unexpected private users in public staging database");
const report = {
  checkedAt: new Date().toISOString(),
  status: "STAGING_OWNED_PUBLIC_LIBRARY_IMPORTED",
  checksum,
  counts,
  rowsWritten,
  privateRecordsExported: false,
  currentPatchPromoted: false,
  payloadVerification:
    "Exact first/last entry read-back per collection; full row counts and source manifests",
  applicationConnected: false,
};
writeFileSync(`${folder}/import-result.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
