import { readFileSync, writeFileSync } from "node:fs";
// Explicit SQLite equivalents of the additive PostgreSQL domain invariants. BEFORE triggers
// add enforcement without rebuilding tables or deleting existing data.
const c = (name) => `NEW."${name}"`;
const region = `${c("region")} IN ('europe','americas','asia')`;
const identity = (name) => {
  const id = c(name),
    at = `instr(${id}, '@')`,
    base = `(CASE WHEN ${at}=0 THEN substr(${id},4) ELSE substr(${id},4,${at}-4) END)`;
  return `${id} GLOB 'T[1-8]_*' AND length(${base})>0 AND ${base} NOT GLOB '*[^A-Z0-9_]*' AND (${at}=0 OR (${at}=length(${id})-1 AND substr(${id},-1) GLOB '[1-4]'))`;
};
const target = (...names) => names.map((name) => `(${c(name)} IS NOT NULL)`).join(" + ") + " = 1";
const rules = [
  ["User", "User_region_valid", region],
  ["Build", "Build_region_valid", region],
  ["Build", "Build_playerCount_valid", `${c("playerCount")} BETWEEN 1 AND 400`],
  ["Build", "Build_recommendedIP_valid", `${c("recommendedIP")} BETWEEN 0 AND 4000`],
  ["Build", "Build_version_valid", `${c("version")}>=1`],
  ["Build", "Build_title_length", `length(${c("title")}) BETWEEN 3 AND 100`],
  ["BuildEquipment", "BuildEquipment_quality_valid", `${c("quality")} BETWEEN 1 AND 5`],
  [
    "BuildEquipment",
    "BuildEquipment_slot_valid",
    `${c("slot")} IN ('Main hand','Off hand','Helmet','Chest','Boots','Cape','Bag','Mount','Food','Potion')`,
  ],
  [
    "BuildEquipment",
    "BuildEquipment_itemId_valid",
    `length(${c("itemId")}) BETWEEN 3 AND 100 AND ${c("itemId")} NOT GLOB '*[^A-Z0-9_@]*'`,
  ],
  ["BuildVersion", "BuildVersion_version_valid", `${c("version")}>=1`],
  ["ContentComment", "Comment_exactly_one_target", target("buildId", "compositionId")],
  [
    "ContentComment",
    "Comment_valid_body_version",
    `length(${c("body")}) BETWEEN 3 AND 3000 AND ${c("version")}>0`,
  ],
  [
    "CommentRevision",
    "CommentRevision_valid_body_version",
    `length(${c("body")}) BETWEEN 3 AND 3000 AND ${c("version")}>0`,
  ],
  ["ContentReport", "Report_exactly_one_target", target("buildId", "compositionId", "commentId")],
  [
    "ContentReport",
    "Report_valid_state",
    `${c("status")} IN ('OPEN','RESOLVED','DISMISSED') AND ${c("version")}>0 AND length(${c("reason")}) BETWEEN 10 AND 2000`,
  ],
  [
    "Timer",
    "Timer_domain",
    `${c("durationMs")} BETWEEN 60000 AND 1800000000 AND ${c("version")}>0 AND ${c("category")} IN ('CROP','ANIMAL','LABORER','FOCUS','REMINDER','CUSTOM') AND length(${c("title")}) BETWEEN 1 AND 100`,
  ],
  [
    "Timer",
    "Timer_state",
    `(${c("status")}='RUNNING' AND ${c("dueAt")} IS NOT NULL AND ${c("remainingMs")} IS NULL) OR (${c("status")}='PAUSED' AND ${c("dueAt")} IS NULL AND ${c("remainingMs")} IS NOT NULL AND ${c("remainingMs")}>=0) OR (${c("status")}='COMPLETED' AND ${c("dueAt")} IS NULL AND ${c("remainingMs")} IS NOT NULL AND ${c("remainingMs")}=0)`,
  ],
  [
    "ItemMetadata",
    "Metadata_identity",
    `${identity("id")} AND CAST(substr(${c("id")},2,1) AS INTEGER)=${c("tier")} AND (CASE WHEN instr(${c("id")},'@')=0 THEN 0 ELSE CAST(substr(${c("id")},-1) AS INTEGER) END)=${c("enchantment")}`,
  ],
  [
    "ItemMetadata",
    "Metadata_power",
    `${c("itemPower")} IS NULL OR ${c("itemPower")} BETWEEN 0 AND 5000`,
  ],
  ["MarketWatchItem", "MarketWatchItem_region_check", region],
  ["MarketWatchItem", "MarketWatchItem_quality_check", `${c("quality")} BETWEEN 1 AND 5`],
  [
    "MarketWatchItem",
    "MarketWatchItem_itemId_check",
    `length(${c("itemId")})<=100 AND ${identity("itemId")}`,
  ],
];
const output =
  "-- Generated additive equivalents of PostgreSQL QA/community/personal/watchlist invariants.\n-- Regenerate: node scripts/cloudflare-domain-constraints.mjs\n" +
  rules
    .flatMap(([table, name, condition]) =>
      ["INSERT", "UPDATE"].map(
        (event) =>
          `CREATE TRIGGER IF NOT EXISTS "${name}_${event.toLowerCase()}" BEFORE ${event} ON "${table}"\nWHEN NOT (${condition})\nBEGIN SELECT RAISE(ABORT, '${name}'); END;`,
      ),
    )
    .join("\n\n") +
  "\n";
const path = "cloudflare/d1/migrations/0003_domain_invariants.sql";
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output) throw new Error("SQLite domain migration is stale");
} else writeFileSync(path, output);
console.log(JSON.stringify({ constraints: rules.length, additiveTriggers: rules.length * 2 }));
