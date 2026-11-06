import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { ChartNoAxesCombined, History, Star } from "lucide-react";
import { Market } from "@/components/market";
import { MastheadTabs } from "@/components/masthead-tabs";
import { WorkspaceHeading } from "@/components/workspace-heading";
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
    <div className="market-explorer-page">
      <WorkspaceHeading
        glyph="market"
        scene="market"
        title="Market Explorer"
        description="Every city's buy and sell orders for one item, each with the time it was seen."
      >
        <MastheadTabs
          label="Market tools"
          tabs={[
            {
              href: "#market-board-title",
              label: "City orders",
              anchor: true,
              icon: <ChartNoAxesCombined size={16} />,
              current: true,
            },
            {
              href: "#market-history-research",
              label: "Price history",
              icon: <History size={16} />,
              anchor: true,
            },
            {
              href: "#market-saved-research",
              label: "Research & watchlist",
              icon: <Star size={16} />,
              anchor: true,
            },
          ]}
        />
      </WorkspaceHeading>
      <Market key={`${p.item || "T4_BAG"}:${p.quality || "1"}`} />
    </div>
  );
}
