import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { Market } from "@/components/market";
import { MarketViewProvider, MarketViewTabs } from "@/components/market-view";
import { WorkspaceHeading } from "@/components/workspace-heading";
import marketPage from "@/components/market-page.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/market", await searchParams);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; quality?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className={marketPage.page}>
      <MarketViewProvider>
        <WorkspaceHeading
          glyph="market"
          scene="market"
          title="Market Explorer"
          accent="Explorer"
          description="Every city's buy and sell orders for one item, each with the time it was seen."
          actions={<MarketViewTabs />}
        />
        <Market key={`${p.item || "T4_BAG"}:${p.quality || "1"}`} />
      </MarketViewProvider>
    </div>
  );
}
