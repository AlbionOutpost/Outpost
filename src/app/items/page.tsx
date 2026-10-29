import { db } from "@/lib/db";
import { ItemCatalog } from "@/components/item-catalog";
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
      <header className="workspace-identity">
        <div>
          <h1 className="page-title display-title">Item browser</h1>
          <p className="intro">
            Find gear by name, tier and enchantment. Compare prices and inspect the available item
            data. Current-patch verification is pending.
          </p>
        </div>
      </header>
      <ItemCatalog metadata={metadata} total={total} categories={slots.map((i) => i.slot).sort()} />
    </>
  );
}
