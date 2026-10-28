import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Prisma } from "@prisma/client";

const source = readFileSync("prisma/schema.prisma", "utf8");
const header =
  "// Generated migration candidate; not the active application schema.\n// Regenerate with node scripts/cloudflare-d1-schema.mjs.\n";
const schema =
  header +
  source
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace('env("DATABASE_URL")', 'env("D1_MIGRATION_URL")')
    .replace(/\s*@db\.Text/g, "")
    .replace(
      /alternativeItemIds String\[\] @default\(\[\]\)/,
      'alternativeItemIds Json @default("[]")',
    );
mkdirSync(".qa/cloudflare-launch", { recursive: true });
mkdirSync("cloudflare/d1/migrations", { recursive: true });
writeFileSync(".qa/cloudflare-launch/schema.sqlite.prisma", schema);
const result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    ".qa/cloudflare-launch/schema.sqlite.prisma",
    "--script",
  ],
  {
    env: { ...process.env, D1_MIGRATION_URL: "file:/tmp/outpost-schema-candidate.db" },
    encoding: "utf8",
  },
);
if (result.status !== 0)
  throw Error("Prisma could not generate the isolated SQLite schema candidate.");
const models = Prisma.dmmf.datamodel.models;
const enums = Prisma.dmmf.datamodel.enums;
let model;
const sql =
  "-- Generated D1 schema candidate. STAGING ONLY; no application cutover or data export.\nPRAGMA foreign_keys=ON;\n\n" +
  result.stdout
    .split("\n")
    .map((line) => {
      const table = line.match(/^CREATE TABLE "([^"]+)"/);
      if (table) model = models.find((m) => (m.dbName || m.name) === table[1]);
      const column = line.match(/^\s+"([^"]+)"/);
      const field = column && model?.fields.find((f) => (f.dbName || f.name) === column[1]);
      // Prisma 6 emits bare []/{} JSON defaults; D1 stores JSON as validated SQLite TEXT.
      line = line.replace(/\bJSONB\b/g, "TEXT").replace(/DEFAULT (\[\]|\{\})/g, "DEFAULT '$1'");
      const checks = [];
      if (field?.type === "Json" || (field?.isList && field.kind !== "object")) {
        checks.push(`json_valid("${column[1]}")`);
        if (field.isList) checks.push(`json_type("${column[1]}") = 'array'`);
      }
      if (field?.kind === "enum") {
        const values = enums
          .find((e) => e.name === field.type)
          .values.map((v) => `'${v.name}'`)
          .join(", ");
        checks.push(`"${column[1]}" IN (${values})`);
      }
      if (checks.length)
        line = line.replace(/,?$/, (comma) => ` CHECK (${checks.join(" AND ")})${comma}`);
      return line;
    })
    .join("\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const manifest =
  JSON.stringify(
    {
      status: "STAGING_ONLY_NOT_APPLICATION_COMPATIBLE",
      sourceSchemaSha256: hash(source),
      schemaSha256: hash(schema),
      sqlSha256: hash(sql),
      tables: models.length,
      indexes: (sql.match(/CREATE (?:UNIQUE )?INDEX/g) || []).length,
      differences: [
        "PostgreSQL scalar arrays become JSON arrays",
        "JSONB becomes validated JSON text",
        "Enums have SQLite CHECK constraints",
        "Prisma D1 does not preserve the application's interactive transaction guarantees",
        "Redis, case-insensitive search, archive filesystem reads and Next runtime still require migration",
      ],
      privateRecordsExported: false,
    },
    null,
    2,
  ) + "\n";
for (const [path, content] of [
  ["cloudflare/d1/schema.prisma", schema],
  ["cloudflare/d1/migrations/0001_schema_candidate.sql", sql],
  ["cloudflare/d1/manifest.json", manifest],
]) {
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== content)
      throw Error(`Generated D1 candidate is stale: ${path}`);
  } else writeFileSync(path, content);
}
console.log(
  JSON.stringify({
    status: process.argv.includes("--check") ? "current" : "generated",
    tables: models.length,
    schemaOnly: true,
    applicationCutover: false,
  }),
);
