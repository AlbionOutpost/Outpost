import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";

if (!process.argv.includes("--apply"))
  throw Error("Use --apply to provision the isolated staging database.");
const credentials = loadCloudflareCredentials();
const manifest = JSON.parse(readFileSync("cloudflare/d1/manifest.json", "utf8"));
const name = "albionoutpost-staging";
const databases = (await api("GET", `/accounts/${credentials.accountId}/d1/database?per_page=100`))
  .result;
let database = databases.find((r) => r.name === name);
const created = !database;
if (!database)
  database = (
    await api("POST", `/accounts/${credentials.accountId}/d1/database`, {
      name,
      jurisdiction: "eu",
      read_replication: { mode: "disabled" },
    })
  ).result;
if (database.name !== name || !/^[a-f0-9-]{36}$/.test(database.uuid))
  throw Error("Unexpected staging database selection.");
const query = async (sql, params = []) => {
  const result = (
    await api("POST", `/accounts/${credentials.accountId}/d1/database/${database.uuid}/query`, {
      sql,
      params,
    })
  ).result;
  if (!Array.isArray(result) || result.some((r) => r.success !== true))
    throw Error("D1 query did not succeed; raw responses withheld.");
  return result;
};
const tables = (
  await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  )
)[0].results;
const marker = tables.find((r) => r.name === "outpost_infrastructure");
if (tables.length && !marker)
  throw Error(
    "Existing database is not an empty or recognized Outpost staging target. Nothing overwritten.",
  );
if (marker) {
  const existing = (await query("SELECT schema_sha256 FROM outpost_infrastructure WHERE id=1"))[0]
    .results[0];
  if (existing?.schema_sha256 !== manifest.sqlSha256)
    throw Error("Staging schema differs; review an additive migration before continuing.");
} else {
  // Only a newly empty, dedicated target reaches this branch. Existing PostgreSQL is never accessed.
  await query(readFileSync("cloudflare/d1/migrations/0001_schema_candidate.sql", "utf8"));
  await query(
    "CREATE TABLE outpost_infrastructure (id INTEGER PRIMARY KEY CHECK(id=1), schema_sha256 TEXT NOT NULL, status TEXT NOT NULL CHECK(status='STAGING_ONLY'), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  await query(
    "INSERT INTO outpost_infrastructure(id,schema_sha256,status) VALUES(1,?,'STAGING_ONLY')",
    [manifest.sqlSha256],
  );
}
const after = (
  await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  )
)[0].results;
if (after.length !== manifest.tables + 1)
  throw Error("D1 table count does not match the generated staging manifest.");
const integrity = (await query("PRAGMA foreign_key_check"))[0].results;
if (integrity.length) throw Error("D1 foreign key check failed.");
const counts = (
  await query(
    'SELECT (SELECT COUNT(*) FROM "User") AS users, (SELECT COUNT(*) FROM "Build") AS builds, (SELECT COUNT(*) FROM "Account") AS accounts',
  )
)[0];
const report = {
  checkedAt: new Date().toISOString(),
  name,
  created,
  jurisdiction: "eu",
  status: "STAGING_SCHEMA_READY_APPLICATION_NOT_CONNECTED",
  schemaSha256: manifest.sqlSha256,
  applicationTables: manifest.tables,
  indexes: manifest.indexes,
  tableCount: after.length,
  foreignKeyErrors: integrity.length,
  counts: counts.results[0],
  readMetrics: counts.meta,
  privateRecordsExported: false,
  currentPostgresqlChanged: false,
  workersPlanChanged: false,
  r2Enabled: false,
};
mkdirSync(".qa/cloudflare-launch", { recursive: true });
writeFileSync(".qa/cloudflare-launch/d1-provision.json", JSON.stringify(report, null, 2) + "\n");
writeFileSync(
  ".qa/cloudflare-launch/d1-target.json",
  JSON.stringify({ name, databaseId: database.uuid, jurisdiction: "eu" }, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(JSON.stringify(report, null, 2));
