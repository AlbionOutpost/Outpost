import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { normalizeItemSnapshot, snapshotSlots } from "../src/lib/catalog/item-snapshot";
import { catalogBundle } from "../src/lib/catalog/validation";

const manifest = JSON.parse(await readFile("docs/data/item-snapshot-source.json", "utf8"));
const input = process.argv[2];
if (!input) throw new Error("Provide the local checksum-pinned source directory");
const items = [],
  files = [];
for (const slot of Object.keys(snapshotSlots) as Array<keyof typeof snapshotSlots>) {
  const file = join(input, `${slot}.json`);
  if ((await stat(file)).size > 10 * 1024 * 1024) throw new Error("Snapshot file exceeds 10MiB");
  const bytes = await readFile(file);
  if (createHash("sha256").update(bytes).digest("hex") !== manifest.files[slot].sha256)
    throw new Error(`Snapshot checksum mismatch: ${slot}`);
  const result = normalizeItemSnapshot(
    JSON.parse(bytes.toString()),
    slot,
    manifest.files[slot].url,
  );
  items.push(...result.items);
  const { items: _items, ...coverage } = result;
  files.push({ slot, ...coverage, records: result.items.length });
}
const bundle = catalogBundle.parse({
  version: "ao-snapshot-20260712-d72a159",
  sourceUrl: `https://github.com/${manifest.repository}/tree/${manifest.revision}`,
  rightsReference: manifest.rightsReference,
  items: items.sort((a, b) => a.id.localeCompare(b.id)),
});
await mkdir("data/catalog", { recursive: true });
const serialized = JSON.stringify(bundle);
await writeFile("data/catalog/ao-snapshot-20260712.json", serialized + "\n");
await writeFile(
  "docs/data/item-snapshot-coverage.json",
  JSON.stringify(
    {
      sourceRevision: manifest.revision,
      sourceDate: manifest.sourceDate,
      files,
      records: items.length,
      abilityMappings: items.reduce((n, i) => n + i.abilities.length, 0),
      recordsWithAbilities: items.filter((i) => i.abilities.length).length,
      recordsWithItemPower: items.filter((i) => i.itemPower !== null).length,
      manuallyFullyVerified: 0,
      unlocksVerified: 0,
      currentPatchVerified: 0,
      normalizedSha256: createHash("sha256").update(serialized).digest("hex"),
      limitations:
        "July source; no October patch binding, unlocks, image review or recipe return eligibility. Nested variant spell inheritance not inferred. No complete game denominator.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ prepared: items.length, databaseActivated: false }));
