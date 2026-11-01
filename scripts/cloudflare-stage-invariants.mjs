import { readFileSync, writeFileSync } from "node:fs";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";
const { accountId } = loadCloudflareCredentials();
const target = JSON.parse(readFileSync(".qa/cloudflare-launch/d1-target.json", "utf8"));
if (target.name !== "albionoutpost-staging" || !/^[a-f0-9-]{36}$/.test(target.databaseId))
  throw new Error("Unexpected staging target");
const base = `/accounts/${accountId}/d1/database/${target.databaseId}`;
if ((await api("GET", base)).result.name !== target.name)
  throw new Error("Staging identity mismatch");
const query = async (sql) => {
  const response = (await api("POST", `${base}/query`, { sql })).result;
  if (!Array.isArray(response) || response.some((row) => !row.success))
    throw new Error("Domain invariant query failed");
  return response;
};
const source = readFileSync("cloudflare/d1/migrations/0003_domain_invariants.sql", "utf8");
const constraints = [
  ...source.matchAll(
    /CREATE TRIGGER IF NOT EXISTS "([A-Za-z_]+)_insert" BEFORE INSERT ON "([A-Za-z]+)"\nWHEN NOT \((.+)\)\nBEGIN/g,
  ),
];
if (constraints.length !== 22) throw new Error("Unexpected domain invariant migration");
const checks = [];
for (const [, name, table, condition] of constraints) {
  const result = (
    await query(
      `SELECT COUNT(*) AS invalid FROM "${table}" AS candidate WHERE NOT (${condition.replaceAll("NEW.", "candidate.")})`,
    )
  )[0].results[0];
  if (result.invalid !== 0)
    throw new Error(`Existing data violates ${name}; reviewed remediation required`);
  checks.push({ constraint: name, invalidRows: 0 });
}
if (process.argv.includes("--apply")) await query(source);
const triggers = (await query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger'"))[0]
  .results[0].n;
const integrity = (await query("PRAGMA foreign_key_check"))[0].results;
if (integrity.length || (process.argv.includes("--apply") && triggers !== 44))
  throw new Error("Domain invariant read-back failed");
const report = {
  checkedAt: new Date().toISOString(),
  applied: process.argv.includes("--apply"),
  constraints: checks,
  triggers,
  foreignKeyViolations: integrity.length,
  rowsDeleted: 0,
};
writeFileSync(".qa/cloudflare-launch/domain-invariants.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    applied: report.applied,
    constraints: checks.length,
    triggers,
    foreignKeyViolations: 0,
    rowsDeleted: 0,
  }),
);
