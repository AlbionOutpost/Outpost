// Attach the archive's public upvote counts to the library builds and group builds.
// Usage: node scripts/import-grind-upvotes.mjs <public-builds.csv> <public-group-builds.csv>
// The CSVs are the owner's dated archive export (see docs/DATA.md); counts are copied as
// recorded, never estimated, and a record missing from the CSV keeps no count.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const [buildsCsv, groupsCsv] = process.argv.slice(2);
if (!buildsCsv || !groupsCsv) {
  console.error(
    "Usage: node scripts/import-grind-upvotes.mjs <public-builds.csv> <public-group-builds.csv>",
  );
  process.exit(1);
}
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}
const counts = (path) =>
  new Map(
    parseCsv(readFileSync(path, "utf8"))
      .filter((r) => /^[0-9a-f-]{36}$/.test(r.id) && /^\d+$/.test(r.upvote_count))
      .flatMap((r) => [
        [r.id, Number(r.upvote_count)],
        [r.slug, Number(r.upvote_count)],
      ]),
  );
let touched = 0;
for (const [file, source] of [
  ["public/library/grind-builds.json", counts(buildsCsv)],
  ["public/library/grind-compositions.json", counts(groupsCsv)],
]) {
  const rows = JSON.parse(readFileSync(file, "utf8"));
  let matched = 0;
  for (const row of rows) {
    const key = row.id ?? row.slug;
    const value = source.get(key) ?? source.get(row.slug);
    if (value === undefined) {
      delete row.upvotes;
      continue;
    }
    row.upvotes = value;
    matched++;
  }
  writeFileSync(file, JSON.stringify(rows));
  touched += matched;
  console.log(`${file}: ${matched}/${rows.length} records carry an upvote count`);
}
const manifestPath = "public/library/grind-manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.upvotes = {
  importedAt: new Date().toISOString().slice(0, 10),
  source: "Owner archive public-builds.csv / public-group-builds.csv upvote_count",
  records: touched,
};
manifest.outputSha256 = Object.fromEntries(
  ["grind-builds.json", "grind-compositions.json"].map((name) => [
    name,
    createHash("sha256")
      .update(readFileSync(`public/library/${name}`))
      .digest("hex"),
  ]),
);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
