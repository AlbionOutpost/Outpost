import { WorkspaceHeading } from "@/components/workspace-heading";
import { OpportunityScanner } from "@/components/opportunity-scanner";
import { TradeCalculator } from "@/components/trade-calculator";
export const metadata = { title: "Market flipping" };
export default function Page() {
  return (
    <div className="trade-calculator-page">
      <WorkspaceHeading
        glyph="trade"
        scene="market"
        title="Market flipping"
        description="Enter purchase and sale prices, configure your fees, and compare the net return before you trade."
      />
      <TradeCalculator />
      <OpportunityScanner />
    </div>
  );
}
