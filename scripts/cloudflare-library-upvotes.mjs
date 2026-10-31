// Carries the archive's like counts into the staged D1 library (rows staged before the
// upvote import have none) and sets the builds manifest total to the listed count
// (src/lib/library-scope.ts). Writes .qa/cloudflare-library/upvotes.json; with --apply it
// updates the staging database through the API. Idempotent: json_set overwrites.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";

const folder = ".qa/cloudflare-library";
mkdirSync(folder, { recursive: true });
const updates = [];
let listed = 0;
for (const kind of ["builds", "compositions"]) {
  for (const row of JSON.parse(readFileSync(`public/library/grind-${kind}.json`, "utf8"))) {
    if (kind === "builds" && (row.updatedAt ?? "") >= "2026" && (row.upvotes ?? 0) >= 1) listed++;
    if (row.upvotes > 0) updates.push([kind, row.id ?? row.slug, row.upvotes]);
  }
}
writeFileSync(`${folder}/upvotes.json`, JSON.stringify({ listed, updates }));
console.log(JSON.stringify({ prepared: true, listed, updates: updates.length }));
if (!process.argv.includes("--apply")) process.exit(0);

const { accountId } = loadCloudflareCredentials();
const target = JSON.parse(readFileSync(".qa/cloudflare-launch/d1-target.json", "utf8"));
if (target.name !== "albionoutpost-staging" || !/^[a-f0-9-]{36}$/.test(target.databaseId))
  throw new Error("Unexpected public staging target");
const base = `/accounts/${accountId}/d1/database/${target.databaseId}`;
// One statement per call, 30 rows each: D1 binds at most 100 parameters per statement.
for (const kind of ["builds", "compositions"]) {
  const rows = updates.filter((u) => u[0] === kind);
  for (let i = 0; i < rows.length; i += 30) {
    const part = rows.slice(i, i + 30);
    await api("POST", `${base}/query`, {
      sql: `UPDATE OwnedLibrary SET payload = json_set(payload, '$.upvotes', CASE id ${part
        .map(() => "WHEN ? THEN ?")
        .join(" ")} END) WHERE kind = ? AND id IN (${part.map(() => "?").join(",")})`,
      params: [
        ...part.flatMap(([, id, upvotes]) => [id, upvotes]),
        kind,
        ...part.map(([, id]) => id),
      ],
    });
  }
}
await api("POST", `${base}/query`, {
  sql: "UPDATE OwnedLibraryManifest SET total = ? WHERE kind = 'builds'",
  params: [listed],
});
console.log(JSON.stringify({ applied: true, listed, updates: updates.length }));
