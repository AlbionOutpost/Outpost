try {
  process.loadEnvFile(".env");
} catch {}
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { existingReleaseState } from "../src/lib/catalog/release-state";
import { catalogBundle } from "../src/lib/catalog/validation";
import { equipmentFamilies, equipmentId } from "../src/lib/albion/equipment-catalog";
const db = new PrismaClient();
try {
  const requested = process.argv[2];
  const file =
    requested === "--starter" ? undefined : requested || "data/catalog/ao-snapshot-20260712.json";
  if (file && (await stat(file)).size > 10 * 1024 * 1024)
    throw new Error("Metadata bundle exceeds 10MiB");
  const raw = file
    ? JSON.parse(await readFile(file, "utf8"))
    : {
        version: "atlas-original-1",
        sourceUrl: "https://albiononline.com/news/basic-builds-battleaxe",
        rightsReference:
          "Original factual starter index authored for Albion Atlas; no third-party bulk dataset or game descriptions redistributed.",
        items: equipmentFamilies.flatMap((f) =>
          f.tiers.flatMap((t) =>
            f.enchants.map((e) => ({
              id: equipmentId(f, t, e),
              name: `${f.name} · T${t}.${e}`,
              slot: f.slot,
              tier: t,
              enchantment: e,
              itemPower: null,
              abilities: Object.entries(f.abilities).flatMap(([slot, names]) =>
                names.map((name) => ({ id: name, name, slot, unlock: null, sourceUrl: f.source })),
              ),
              recipe: null,
            })),
          ),
        ),
      };
  const bundle = catalogBundle.parse(raw),
    checksum = createHash("sha256").update(JSON.stringify(bundle)).digest("hex");
  const outcome = await db.$transaction(
    async (tx) => {
      const existing = await tx.catalogRelease.findUnique({ where: { version: bundle.version } });
      if (existing) {
        const activeCount = await tx.itemMetadata.count({
          where: { releaseId: existing.id, active: true },
        });
        return existingReleaseState(checksum, existing.checksum, bundle.items.length, activeCount);
      }
      const release = await tx.catalogRelease.create({
        data: {
          version: bundle.version,
          sourceUrl: bundle.sourceUrl,
          rightsReference: bundle.rightsReference,
          checksum,
          itemCount: bundle.items.length,
        },
      });
      await tx.itemMetadata.updateMany({ data: { active: false } });
      for (const item of bundle.items) {
        const data = {
          ...item,
          recipe: item.recipe ?? Prisma.JsonNull,
          releaseId: release.id,
          active: true,
        };
        await tx.itemMetadata.upsert({ where: { id: item.id }, create: data, update: data });
      }
      return "imported" as const;
    },
    { timeout: 120000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  console.log(
    JSON.stringify({
      event: "catalog_synchronized",
      outcome,
      version: bundle.version,
      count: bundle.items.length,
      checksum,
    }),
  );
} finally {
  await db.$disconnect();
}
