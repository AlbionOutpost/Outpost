import { PrismaClient } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
try {
  process.loadEnvFile(".env");
} catch {}
const folder = ".open-next/assets/library/runtime";
mkdirSync(folder, { recursive: true });
function shards(kind, rows, index) {
  for (let i = 0; i < rows.length; i += 32) {
    const part = rows.slice(i, i + 32),
      name = `${kind}-${i / 32}.json`;
    writeFileSync(`${folder}/${name}`, JSON.stringify(part));
    part.forEach((row) => index.push({ ...row, shard: name }));
  }
}
const db = new PrismaClient();
try {
  const items = await db.itemMetadata.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
    releases = await db.catalogRelease.findMany({ where: { items: { some: { active: true } } } });
  if (
    items.some((x) => /QA_FIXTURE|CATALOG_TEST/.test(x.id)) ||
    releases.some((x) => /^(test-|qa-)/.test(x.version))
  )
    throw Error("Fixture catalog cannot be published");
  const index = [];
  shards("catalog", items, index);
  writeFileSync(
    `${folder}/catalog-index.json`,
    JSON.stringify({
      releases,
      items: index.map(
        ({ id, name, slot, tier, enchantment, itemPower, releaseId, active, shard }) => ({
          id,
          name,
          slot,
          tier,
          enchantment,
          itemPower,
          releaseId,
          active,
          shard,
        }),
      ),
    }),
  );
} finally {
  await db.$disconnect();
}
for (const kind of ["builds", "compositions"]) {
  const rows = JSON.parse(readFileSync(`public/library/grind-${kind}.json`, "utf8")),
    index = [];
  shards(kind, rows, index);
  writeFileSync(
    `${folder}/${kind}-index.json`,
    JSON.stringify(
      index.map(({ id, slug, title, author, category, weaponName, tags, shard }) => ({
        id,
        slug,
        title,
        author,
        category,
        weaponName,
        tags,
        shard,
      })),
    ),
  );
}
console.log("Prepared public-only catalog and library indexes with bounded detail shards.");
