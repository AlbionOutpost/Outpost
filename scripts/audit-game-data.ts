import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  equipmentFamilies,
  equipmentId,
  equipmentSlots,
} from "../src/lib/albion/equipment-catalog";
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
    f.enchants.map((e) => ({
      id: equipmentId(f, t, e),
      name: `${f.name} · T${t}.${e}`,
      slot: f.slot,
      tier: t,
      enchantment: e,
      itemPower: null,
      recipe: null,
      abilities: Object.entries(f.abilities).flatMap(([slot, names]) =>
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
  scope: "Repository-defined starter data, not a live database audit or complete game denominator.",
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
      r.output === "T4_METALBAR"
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
    "Original factual starter index only; full bulk dataset redistribution rights unresolved. Renderer URL compatibility does not certify asset existence/rights or full icon coverage.",
  missing: [
    "Full weapon/offhand/armor families",
    "Food and potion metadata",
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
if (!process.argv.includes("--check"))
  writeFileSync(
    "docs/engineering/GAME_DATA_COVERAGE.md",
    `# Game-data coverage\n\nGenerated ${report.checkedAt}. ${report.scope}\n\n- Equipment variants: ${report.equipmentEntries}; local search names: ${report.localSearchNames}; combined unique IDs: ${report.uniqueCombinedIds}. These are not counts of fully verified current-game records.\n- Structurally invalid mappings: ${invalid.length}; duplicate equipment IDs: ${report.duplicateEquipmentIds}.\n- Unique ability names: ${report.uniqueAbilityNames}; verified unlock requirements/statistics/current-patch entries: **0**.\n- Renderer-compatible IDs: ${report.rendererCompatible}; HTTP availability and universal reuse permission are not certified.\n\n| Slot | Families | Variants |\n|---|---:|---:|\n${report.slots.map((s) => `| ${s.slot} | ${s.families} | ${s.variants} |`).join("\n")}\n\n## Recipe verification\n\n${report.recipes.map((r) => `- ${r.id}: ${r.output}; [source](${r.source}). ${r.review}`).join("\n")}\n\n## Missing and patch status\n\n${report.missing.map((m) => `- ${m}`).join("\n")}\n\n${report.outdatedStatus}\n\n## Verification stages\n\nAuthored equipment: ${entries.length}; schema-validated: ${entries.length - invalid.length}; manually/patch verified:0. Live database external-import counts are not measured by this repository audit. The source pipeline reports separate stages against immutable artifacts; see [verification system](GAME_DATA_VERIFICATION.md). Test fixtures and recent downloads never increase real patch coverage.\n\n## Imported external snapshot (separate denominator)\n\nThe pinned MIT snapshot contains ${importedCoverage.records} schema-valid records, ${importedCoverage.abilityMappings} ability/passive mappings on ${importedCoverage.recordsWithAbilities} base records and ${importedCoverage.recordsWithItemPower} explicit item-power values. Its ${importedCoverage.files.reduce((n: number, f: { sourceRows: number }) => n + f.sourceRows, 0)} raw base rows include ${importedCoverage.files.reduce((n: number, f: { excluded: unknown[] }) => n + f.excluded.length, 0)} excluded identities; explicit nested variants supply the remaining records. Source date: ${importedCoverage.sourceDate}. Full manual verification/unlocks/current-patch verification remain **0**. This is not a complete game denominator. See [source manifest](../data/item-snapshot-source.json), [coverage](../data/item-snapshot-coverage.json) and [activation evidence and limitations](NEXT_MILESTONE_2026-10-26.md). Runtime active counts require an actual database query.\n\n## Sources and rights\n\n${report.sources.map((s) => `- [Original source lead](${s})`).join("\n")}\n\n${report.licensing} Official/wiki source rechecks returned403 on2026-10-26. [Public dump discovery lead](https://github.com/ao-data/ao-bin-dumps) is accessible but current redistribution license/patch compatibility remains unresolved; that dump was not imported. The separately pinned licensed July snapshot was processed and activated locally during the next milestone; it is not October patch verified. Raw machine-readable report: .qa/game-data-coverage.json.\n`,
  );
console.log(
  JSON.stringify({
    equipmentEntries: entries.length,
    combinedIds: report.uniqueCombinedIds,
    invalid: invalid.length,
    patchVerified: 0,
  }),
);
if (invalid.length || report.duplicateEquipmentIds) process.exitCode = 1;
