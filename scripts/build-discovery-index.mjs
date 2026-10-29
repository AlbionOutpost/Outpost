import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const raw = readFileSync("public/library/grind-builds.json"),
  rows = JSON.parse(raw),
  facts = JSON.parse(readFileSync("src/lib/build-weapon-families.json"));
const labels = {
  arcanestaff: "Arcane Staffs",
  axe: "Axes",
  bow: "Bows",
  crossbow: "Crossbows",
  cursestaff: "Cursed Staffs",
  dagger: "Daggers",
  firestaff: "Fire Staffs",
  froststaff: "Frost Staffs",
  holystaff: "Holy Staffs",
  naturestaff: "Nature Staffs",
  mace: "Maces",
  quarterstaff: "Quarterstaffs",
  sword: "Swords",
  spear: "Spears",
  hammer: "Hammers",
  knuckles: "War Gloves",
  shapeshifterstaff: "Shapeshifter Staffs",
  other: "Other weapons",
};
const weapons = new Map(),
  activities = new Map(),
  tags = new Map(),
  families = new Map();
for (const b of rows) {
  const main = b.equipment.find((e) => e.slot === "Main hand"),
    code = /^T[1-8]_(.+?)(?:@[1-4])?$/.exec(main?.itemId || "")?.[1] || "",
    family = facts.codes[code] in labels ? facts.codes[code] : "other";
  families.set(family, (families.get(family) || 0) + 1);
  if (main && b.weaponName) {
    const prev = weapons.get(b.weaponName);
    weapons.set(b.weaponName, {
      name: b.weaponName,
      code,
      family,
      itemId: main.itemId,
      count: (prev?.count || 0) + 1,
    });
  }
  if (b.category) activities.set(b.category, (activities.get(b.category) || 0) + 1);
  for (const tag of new Set(b.tags.map((x) => x.toLowerCase()))) {
    const prior = tags.get(tag);
    tags.set(tag, {
      name: prior?.name || b.tags.find((x) => x.toLowerCase() === tag),
      value: tag,
      count: (prior?.count || 0) + 1,
    });
  }
}
const out = {
  sourceSha256: createHash("sha256").update(raw).digest("hex"),
  total: rows.length,
  families: [...families]
    .map(([id, count]) => ({ id, name: labels[id], count }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  weapons: [...weapons.values()].sort((a, b) => a.name.localeCompare(b.name)),
  activities: [...activities]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id.localeCompare(b.id)),
  tags: [...tags.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
};
const target = "src/lib/build-discovery-index.json",
  text = JSON.stringify(out, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== text)
    throw Error("Build discovery index differs from source");
  console.log({
    mode: "check",
    builds: out.total,
    weapons: out.weapons.length,
    families: out.families.length,
    activities: out.activities.length,
  });
} else {
  writeFileSync(target, text);
  console.log({
    mode: "write",
    builds: out.total,
    weapons: out.weapons.length,
    families: out.families.length,
    activities: out.activities.length,
  });
}
