import { parse } from "@babel/parser";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const source =
  "Scrape/albiononlinegrind.com/report/evidence/source/pages/guides/albion-journal-guide-4108b1b72e7b4be0.js";
const raw = readFileSync(source, "utf8");
const events = [];
// Inspect static syntax only. No evaluation, imports or execution of the captured application.
function visit(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "ObjectExpression") {
    const fields = Object.fromEntries(
      node.properties
        .filter(
          (p) =>
            p.type === "ObjectProperty" &&
            ["StringLiteral", "NumericLiteral"].includes(p.value.type),
        )
        .map((p) => [p.key.name || p.key.value, p.value.value]),
    );
    if (typeof fields.entryID === "string" && typeof fields.name === "string")
      events.push({ position: node.start, type: "entry", ...fields });
    if (typeof fields.targetId === "string" && typeof fields.children === "string")
      events.push({ position: node.start, type: "heading", ...fields });
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc") continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") visit(value);
  }
}
visit(parse(raw));
events.sort((a, b) => a.position - b.position);
let category = "Journal";
const entries = [];
for (const event of events) {
  if (event.type === "heading") category = event.children.replace(/\s*\(\d+\)$/, "");
  else {
    if (!/^(?:JOURNAL|SA)_[A-Z0-9_.]{1,150}$/.test(event.entryID))
      throw Error("Invalid source journal identifier");
    entries.push({
      entryId: event.entryID,
      name: event.name,
      rewardId: event.id || "",
      reward: event.title || "",
      category,
    });
  }
}
if (new Set(entries.map((e) => e.entryId)).size !== entries.length)
  throw Error("Duplicate source journal entry");
const output = "public/library/grind-journal.json";
writeFileSync(output, JSON.stringify(entries) + "\n");
const sha = (value) => createHash("sha256").update(value).digest("hex");
writeFileSync(
  "docs/data/archived-journal-source.json",
  JSON.stringify(
    {
      source,
      sourceSha256: sha(raw),
      capturedAt: "2026-10-27",
      permission: "Owner authorized old-page republication in the 2026-10-28 session",
      method:
        "Static JSX-runtime object literals with explicit entryID/name/reward fields, in source order and explicit section context. Captured code never executed.",
      entries: entries.length,
      categories: [...new Set(entries.map((e) => e.category))],
      output,
      outputSha256: sha(readFileSync(output)),
      currentPatchVerified: false,
      completionDataImported: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    entries: entries.length,
    categories: new Set(entries.map((e) => e.category)).size,
  }),
);
