import Link from "@/components/link";
import { ChartNoAxesCombined, History, Calculator, Star, BookOpen, ArrowRight } from "lucide-react";
import { Market } from "@/components/market";
import { WorkspaceHeading } from "@/components/workspace-heading";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; quality?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="reference-market-layout">
      <nav className="reference-market-rail" aria-label="Market tools">
        <span className="eyebrow">MARKET TOOLS</span>
        <Link href="/tools/market" aria-current="page">
          <ChartNoAxesCombined size={18} /> Market Explorer
        </Link>
        <a href="#market-history-research">
          <History size={18} /> Price History
        </a>
        <Link href="/tools/flipping">
          <Calculator size={18} /> Profit Calculator
        </Link>
        <a href="#market-saved-research">
          <Star size={18} /> Research & Watchlist
        </a>
        <div className="reference-rail-divider" />
        <span className="eyebrow">MORE TOOLS</span>
        <Link href="/tools/crafting">
          Crafting calculator <ArrowRight size={15} />
        </Link>
        <Link href="/tools/refining">
          Refining calculator <ArrowRight size={15} />
        </Link>
        <Link href="/guides">
          <BookOpen size={18} /> Guides
        </Link>
        <p>Player observations, with source timestamps. Check freshness before every trade.</p>
      </nav>
      <div className="market-explorer-page">
        <WorkspaceHeading
          glyph="market"
          scene="market"
          title="Market Explorer"
          description="Find your item. Compare city orders. Choose your next trade."
        />
        <Market key={`${p.item || "T4_BAG"}:${p.quality || "1"}`} />
      </div>
    </div>
  );
}
