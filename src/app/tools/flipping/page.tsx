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
        description="Scan a route for items worth hauling, then check one trade's net return with your own prices and fees."
      />
      <OpportunityScanner />
      <section className="flip-manual-trade" aria-labelledby="flip-manual-heading">
        <h2 id="flip-manual-heading">Check one trade by hand</h2>
        <p className="muted">
          Enter the prices you expect to pay and receive. Nothing here is loaded from the market.
        </p>
        <TradeCalculator />
      </section>
    </div>
  );
}
