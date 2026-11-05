import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { db } from "@/lib/db";
import { ItemCatalog } from "@/components/item-catalog";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/items", await searchParams);
}
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
        description="Browse Albion equipment by name, tier and enchantment, then compare reported market prices."
      />
      <ItemCatalog metadata={metadata} total={total} categories={slots.map((i) => i.slot).sort()} />
    </>
  );
}
