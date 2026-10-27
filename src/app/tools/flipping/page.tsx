import { OpportunityScanner } from "@/components/opportunity-scanner";
import { TradeCalculator } from "@/components/trade-calculator";
export default function Page() {
  return (
    <div className="trade-calculator-page">
      <div className="eyebrow">PROFIT PLANNING</div>
      <h1 className="page-title display-title">Market flipping</h1>
      <p className="intro">
        Manual price scenario · Enter your own observed prices and applicable fees. No game tax
        defaults are assumed.
      </p>
      <TradeCalculator />
      <OpportunityScanner />
    </div>
  );
}
