import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";

try {
  process.loadEnvFile(".env");
} catch {}
const folder = ".qa/cloudflare-catalog";
mkdirSync(folder, { recursive: true });
const db = new PrismaClient();
let catalog;
try {
  const items = await db.itemMetadata.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  const releases = await db.catalogRelease.findMany({
    where: { items: { some: { active: true } } },
    orderBy: { id: "asc" },
  });
  catalog = { CatalogRelease: releases, ItemMetadata: items };
} finally {
  await db.$disconnect();
}
const payload = JSON.stringify(catalog);
const checksum = createHash("sha256").update(payload).digest("hex");
// SQLite itself quotes every value; no manual escaping or executable source interpolation.
const converted = spawnSync(
  "python3",
  [
    "-c",
    `
import json,sqlite3,sys
data=json.load(sys.stdin); db=sqlite3.connect(':memory:')
columns={'CatalogRelease':['id','version','sourceUrl','rightsReference','checksum','importedAt','itemCount'],'ItemMetadata':['id','name','slot','tier','enchantment','itemPower','abilities','recipe','releaseId','active']}
out=[]
for table,names in columns.items():
 rows=[]
 for record in data[table]:
  values=[json.dumps(record[n],separators=(',',':')) if n in ['abilities','recipe'] and record[n] is not None else record[n] for n in names]
  quoted=db.execute('SELECT '+','.join(['quote(?)']*len(values)),values).fetchone()
  rows.append('('+','.join(quoted)+')')
 for start in range(0,len(rows),50):
  out.append('INSERT INTO "'+table+'" ('+','.join('"'+n+'"' for n in names)+') VALUES '+','.join(rows[start:start+50])+';')
print(json.dumps(out))
`,
  ],
  { input: payload, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);
if (converted.status !== 0) throw Error("Public catalog SQL preparation failed.");
const statements = JSON.parse(converted.stdout);
if (statements.some((sql) => Buffer.byteLength(sql) > 95000))
  throw Error("Catalog statement exceeds the bounded SQL budget.");
writeFileSync(
  `${folder}/prepared-summary.json`,
  JSON.stringify(
    {
      checksum,
      items: catalog.ItemMetadata.length,
      releases: catalog.CatalogRelease.length,
      statements: statements.length,
      privateModelsExported: false,
    },
    null,
    2,
  ) + "\n",
);
if (process.argv.includes("--write-local")) {
  writeFileSync(
    `${folder}/local-import.sql`,
    readFileSync("cloudflare/d1/migrations/0001_schema_candidate.sql", "utf8") +
      "\n" +
      statements.join("\n") +
      "\n" +
      readFileSync("cloudflare/d1/migrations/0003_domain_invariants.sql", "utf8"),
  );
}
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      prepared: true,
      items: catalog.ItemMetadata.length,
      statements: statements.length,
      remoteWrites: false,
    }),
  );
  process.exit(0);
}
const { accountId } = loadCloudflareCredentials();
const target = JSON.parse(readFileSync(".qa/cloudflare-launch/d1-target.json", "utf8"));
if (target.name !== "albionoutpost-staging" || !/^[a-f0-9-]{36}$/.test(target.databaseId))
  throw Error("Unexpected staging catalog target.");
const base = `/accounts/${accountId}/d1/database/${target.databaseId}`;
const info = (await api("GET", base)).result;
if (info.name !== target.name) throw Error("Staging database identity mismatch.");
const query = async (sql) => {
  const results = (await api("POST", `${base}/query`, { sql })).result;
  if (!Array.isArray(results) || results.some((r) => !r.success))
    throw Error("D1 catalog operation failed; raw data withheld.");
  return results;
};
const before = (
  await query(
    'SELECT (SELECT count(*) FROM "ItemMetadata") AS items, (SELECT count(*) FROM "CatalogRelease") AS releases, (SELECT count(*) FROM "User") AS users',
  )
)[0].results[0];
if (before.items || before.releases || before.users)
  throw Error("Target is not empty. Review existing data instead of overwriting it.");
let rowsWritten = 0;
for (let start = 0; start < statements.length; start += 5) {
  const result = await query(statements.slice(start, start + 5).join("\n"));
  rowsWritten += result.reduce((sum, row) => sum + (row.meta?.rows_written || 0), 0);
  if (rowsWritten > 80000)
    throw Error("Staging write budget exceeded; stop and review partial import.");
}
const after = (
  await query(
    'SELECT (SELECT count(*) FROM "ItemMetadata") AS items, (SELECT count(*) FROM "CatalogRelease") AS releases, (SELECT count(*) FROM "User") AS users',
  )
)[0].results[0];
if (
  after.items !== catalog.ItemMetadata.length ||
  after.releases !== catalog.CatalogRelease.length ||
  after.users !== 0
)
  throw Error("Catalog count read-back differs.");
const report = {
  checkedAt: new Date().toISOString(),
  status: "STAGING_PUBLIC_CATALOG_IMPORTED",
  checksum,
  counts: after,
  rowsWritten,
  privateRecordsExported: false,
  currentPatchPromoted: false,
  applicationConnected: false,
};
writeFileSync(`${folder}/import-result.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
