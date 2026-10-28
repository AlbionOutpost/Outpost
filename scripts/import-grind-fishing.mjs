import { parse } from "@babel/parser";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = "Scrape/albiononlinegrind.com/report/";
const sourceFiles = [
  root + "data/game-item-definitions.json",
  root + "data/item-names.json",
  root + "data/static-tables/chopped-fish-calculator-5b928be004725cc2.json",
  root + "evidence/source/pages/guides/fishing-leveling-guide-b41f41c834d12087.js",
];
const definitions = JSON.parse(readFileSync(sourceFiles[0], "utf8"));
const names = JSON.parse(readFileSync(sourceFiles[1], "utf8"));
const table = JSON.parse(readFileSync(sourceFiles[2], "utf8")).find(
  (row) => row.variable === "k",
).value;
const fame = new Map();
const tierDiscrepancies = [];
function visit(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "CallExpression" && node.arguments.length === 4) {
    const [tier, id, name, value] = node.arguments;
    if (
      tier.type === "NumericLiteral" &&
      id.type === "StringLiteral" &&
      /^T[1-8]_FISH_[A-Z0-9_]+$/.test(id.value) &&
      name.type === "StringLiteral" &&
      value.type === "NumericLiteral"
    ) {
      fame.set(id.value, { name: name.value.trim(), historicalFame: value.value });
      if (Number(id.value[1]) !== tier.value)
        tierDiscrepancies.push({
          id: id.value,
          declaredTier: tier.value,
          idTier: Number(id.value[1]),
        });
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc") continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") visit(value);
  }
}
visit(parse(readFileSync(sourceFiles[3], "utf8")));
const chopping = definitions.find((row) => row["@uniquename"] === "T1_FISHCHOPS");
const fish = chopping.craftingrequirements
  .map((row) => {
    if (Array.isArray(row.craftresource) || Number(row.craftresource["@count"]) !== 1)
      throw Error("Ambiguous chopping recipe");
    const id = row.craftresource["@uniquename"],
      yieldCount = Number(row["@amountcrafted"]);
    if (!/^T[1-8]_FISH_[A-Z0-9_]+$/.test(id) || !Number.isInteger(yieldCount) || yieldCount < 1)
      throw Error("Invalid fish recipe");
    return {
      id,
      name: names[id] || fame.get(id)?.name || id,
      tier: Number(id[1]),
      choppedPerFish: yieldCount,
      historicalFame: fame.get(id)?.historicalFame ?? null,
    };
  })
  .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
if (new Set(fish.map((f) => f.id)).size !== fish.length) throw Error("Duplicate fish recipe");
for (const row of table) {
  if (fish.find((f) => f.id === row.fish)?.choppedPerFish !== row.choppedFish)
    throw Error("Chopping coefficient differs between captured sources");
}
const output = "public/library/grind-fishing.json";
writeFileSync(output, JSON.stringify(fish) + "\n");
const sha = (value) => createHash("sha256").update(value).digest("hex");
writeFileSync(
  "docs/data/archived-fishing-source.json",
  JSON.stringify(
    {
      capturedAt: "2026-10-27",
      permission: "Owner-authorized old-page recovery,2026-10-28",
      sources: Object.fromEntries(sourceFiles.map((path) => [path, sha(readFileSync(path))])),
      fish: fish.length,
      matchingChopTableRows: table.length,
      fameRows: fame.size,
      tierDiscrepancies,
      method:
        "Explicit T1_FISHCHOPS single-fish recipe amounts; independently cross-checked against all37 old-tool rows. Fame from literal four-argument calls in the archived guide, without executing captured code. Old prices, volumes, date snapshots and frontend functions excluded.",
      fameScope:
        "Historical in-game Premium values from the guide; user editable, not current modifiers/LP/level thresholds",
      currentPatchVerified: false,
      output,
      outputSha256: sha(readFileSync(output)),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    fish: fish.length,
    fameRows: fame.size,
    independentChopMatches: table.length,
    tierDiscrepancies,
  }),
);
