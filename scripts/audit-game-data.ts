import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  equipmentFamilies,
  findEquipment,
  equipmentId,
  equipmentSlots,
} from "../src/lib/albion/equipment-catalog";
import { abilitiesFor } from "../src/lib/albion/equipment-abilities";
import { items } from "../src/lib/albion/item-database";
import { recipes } from "../src/lib/albion/recipes";
import { catalogItem, catalogBundle } from "../src/lib/catalog/validation";
import { itemIconUrl } from "../src/lib/albion/item-renderer";
const importedCoverage = JSON.parse(readFileSync("docs/data/item-snapshot-coverage.json", "utf8"));
const importedBundle = catalogBundle.parse(
  JSON.parse(readFileSync("data/catalog/ao-snapshot-20260712.json", "utf8")),
);
if (
  createHash("sha256").update(JSON.stringify(importedBundle)).digest("hex") !==
    importedCoverage.normalizedSha256 ||
  importedBundle.items.length !== importedCoverage.records
)
  throw new Error("Pinned imported catalog integrity mismatch");
const entries = equipmentFamilies.flatMap((f) =>
  f.tiers.flatMap((t) =>
    f.enchants
      .filter((e) => !!findEquipment(equipmentId(f, t, e)))
      .map((e) => ({
        id: equipmentId(f, t, e),
        name: `${f.name} · T${t}.${e}`,
        slot: f.slot,
        tier: t,
        enchantment: e,
        itemPower: null,
        recipe: null,
        abilities: Object.entries(abilitiesFor(equipmentId(f, t, e))).flatMap(([slot, names]) =>
          names.map((name) => ({ id: name, name, slot, unlock: null, sourceUrl: f.source })),
        ),
      })),
  ),
);
const invalid = entries.flatMap((item) => {
  const result = catalogItem.safeParse(item);
  return result.success ? [] : [{ id: item.id, issues: result.error.issues.map((i) => i.message) }];
});
const identifiers = new Set(entries.map((e) => e.id));
const report = {
  checkedAt: new Date().toISOString(),
  scope:
    "Repository workbench data, including source-listed metadata; not a live database audit or complete game denominator.",
  verificationStages: {
    authoredEquipment: entries.length,
    schemaValidatedEquipment: entries.length - invalid.length,
    externalSourceImported: importedBundle.items.length,
    manuallyVerified: 0,
    patchVerified: 0,
  },
  equipmentEntries: entries.length,
  importedSnapshot: {
    ...importedCoverage,
    scope:
      "Checksum-validated repository bundle; live database activation counted separately in .qa/next-milestone/runtime-catalog.json",
  },
  localSearchNames: items.length,
  uniqueCombinedIds: new Set([...identifiers, ...items.map((i) => i.id)]).size,
  duplicateEquipmentIds: entries.length - identifiers.size,
  invalidMappings: invalid,
  slots: equipmentSlots.map((slot) => ({
    slot,
    families: equipmentFamilies.filter((f) => f.slot === slot).length,
    variants: entries.filter((e) => e.slot === slot).length,
  })),
  uniqueAbilityNames: new Set(entries.flatMap((e) => e.abilities.map((a) => a.name))).size,
  verifiedUnlockRequirements: 0,
  currentPatchVerifiedEntries: 0,
  statisticEntries: 0,
  recipes: recipes.map((r) => ({
    id: r.id,
    kind: r.kind,
    output: r.output,
    source: r.source,
    currentPatchVerified: false,
    review:
      r.output === "T4_METALBAR" && r.source.includes("Pristine")
        ? "Source points to Pristine Steel Bar while output is plain Steel Bar; source applicability needs verification."
        : "Current source/patch recheck required.",
  })),
  rendererCompatible: entries.filter((e) => {
    try {
      itemIconUrl(e.id);
      return true;
    } catch {
      return false;
    }
  }).length,
  sources: [...new Set(equipmentFamilies.map((f) => f.source))],
  licensing:
    "Pinned July MIT equipment identity and source-listed spell names, plus retained starter references; October recipe facts have a separate explicit rights boundary. Renderer URL compatibility does not certify asset existence/rights or full icon coverage.",
  missing: [
    "Full weapon/offhand/armor families",
    "Verified food/potion effects, yields and current-patch applicability",
    "Full mounts and economic item categories",
    "Ability descriptions, passives and unlock levels",
    "Item statistics and patch compatibility",
    "Full crafting/refining/cooking/alchemy recipes",
  ],
  outdatedStatus:
    "Unknown: no current patch reference baseline is verified; zero confirmed-current entries. Do not infer zero outdated entries.",
};
mkdirSync(".qa", { recursive: true });
writeFileSync(".qa/game-data-coverage.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    equipmentEntries: entries.length,
    combinedIds: report.uniqueCombinedIds,
    invalid: invalid.length,
    patchVerified: 0,
  }),
);
if (invalid.length || report.duplicateEquipmentIds) process.exitCode = 1;
