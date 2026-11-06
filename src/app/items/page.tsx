import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { db } from "@/lib/db";
import { ItemCatalog } from "@/components/item-catalog";
import { MarketNextSteps } from "@/components/market-next-steps";
import styles from "./items.module.css";
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
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="catalog"
        scene="market"
        title="Item database"
        description="Find any item by name, tier or enchantment, then open it for prices, abilities and its recipe."
      />
      <ItemCatalog metadata={metadata} total={total} categories={slots.map((i) => i.slot).sort()} />
      <MarketNextSteps show={["market", "crafting", "planner"]} />
    </div>
  );
}
