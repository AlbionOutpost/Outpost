import {
  ChartNoAxesCombined,
  History,
  Calculator,
  Star,
  BookOpen,
  Hammer,
  Pickaxe,
} from "lucide-react";
import { Market } from "@/components/market";
import { MastheadTabs } from "@/components/masthead-tabs";
import { WorkspaceHeading } from "@/components/workspace-heading";
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
        description="Find your item. Compare city orders. Choose your next trade."
      >
        <MastheadTabs
          label="Market tools"
          tabs={[
            {
              href: "/tools/market",
              label: "Market Explorer",
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
            {
              href: "/tools/flipping",
              label: "Flipping calculator",
              icon: <Calculator size={16} />,
            },
            { href: "/tools/crafting", label: "Crafting", icon: <Hammer size={16} /> },
            { href: "/tools/refining", label: "Refining", icon: <Pickaxe size={16} /> },
            { href: "/guides", label: "Guides", icon: <BookOpen size={16} /> },
          ]}
        />
      </WorkspaceHeading>
      <Market key={`${p.item || "T4_BAG"}:${p.quality || "1"}`} />
    </div>
  );
}
