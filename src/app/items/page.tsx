import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { db } from "@/lib/db";
import { catalogQuery, searchCatalog, type CatalogQuery } from "@/lib/catalog/item-search";
import { ItemCatalog } from "@/components/item-catalog";
import { MarketNextSteps } from "@/components/market-next-steps";
import styles from "./items.module.css";
import marketPage from "@/components/market-page.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/items", await searchParams);
}
/** The filters live in the URL (`?q=claymore&category=Main hand&tier=6`), so Back and links keep them. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    value = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  // Each parameter is checked on its own; a malformed one is ignored, not an error page.
  const field = <K extends keyof typeof catalogQuery.shape>(key: K, input: unknown) =>
    catalogQuery.shape[key].safeParse(input).data as CatalogQuery[K];
  const query: CatalogQuery = {
    search: field("search", value("q")?.slice(0, 100)) ?? "",
    slot: field("slot", value("category")),
    tier: field("tier", value("tier")),
    enchantment: field("enchantment", value("enchantment")),
    page: field("page", value("page")) ?? 1,
  };
  const [first, slots] = await Promise.all([
    searchCatalog(query),
    db.itemMetadata.findMany({
      where: { active: true },
      distinct: ["slot"],
      select: { slot: true },
    }),
  ]);
  return (
    <div className={`${styles.page} ${marketPage.page}`}>
      <WorkspaceHeading
        glyph="catalog"
        scene="market"
        title="Item database"
        accent="database"
        description="Find any item by name, tier or enchantment, then open it for prices, abilities and its recipe."
      />
      <ItemCatalog
        metadata={first.items}
        total={first.total}
        categories={slots.map((i) => i.slot).sort()}
        initial={{
          search: query.search,
          category: query.slot ?? "",
          tier: query.tier ? String(query.tier) : "",
          enchantment: query.enchantment === undefined ? "" : String(query.enchantment),
          page: query.page,
        }}
      />
      <MarketNextSteps
        show={["market", "crafting", "planner"]}
        title={
          <>
            Found what you <em>need</em>?
          </>
        }
        line="Price it in every city, see if crafting it pays, or add it to a shopping list."
      />
    </div>
  );
}
