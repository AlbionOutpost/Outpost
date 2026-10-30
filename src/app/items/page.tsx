import { WorkspaceHeading } from "@/components/workspace-heading";
import { db } from "@/lib/db";
import { ItemCatalog } from "@/components/item-catalog";
export const metadata = { title: "Item database" };
export default async function Page() {
  const [metadata, total, slots] = await Promise.all([
    db.itemMetadata.findMany({
      where: { active: true },
      take: 30,
      orderBy: { id: "asc" },
      select: { id: true, name: true, tier: true, enchantment: true, slot: true },
    }),
    db.itemMetadata.count({ where: { active: true } }),
    db.itemMetadata.findMany({
      where: { active: true },
      distinct: ["slot"],
      select: { slot: true },
    }),
  ]);
  return (
    <>
      <WorkspaceHeading
        glyph="catalog"
        scene="market"
        title="Item database"
        description="Every item's stats, abilities, recipes, tiers and current prices. Find gear by name, tier and enchantment."
      />
      <ItemCatalog metadata={metadata} total={total} categories={slots.map((i) => i.slot).sort()} />
    </>
  );
}
