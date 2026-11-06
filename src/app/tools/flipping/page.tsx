import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { OpportunityScanner } from "@/components/opportunity-scanner";
import { TradeCalculator } from "@/components/trade-calculator";
import { SectionHeading } from "@/components/section-heading";
import { CalculatorCta } from "@/components/calculator-cta";
import styles from "@/app/production-calculator.module.css";
import c from "@/app/calculators.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/flipping", await searchParams);
}
export default function Page() {
  return (
    <div className={`${styles.page} ${c.flipping}`}>
      <WorkspaceHeading
        glyph="trade"
        scene="market"
        title="Market flipping"
        accent="flipping"
        description="Scan a route for items that sell for more in the other city, then check one trade with your own prices and fees."
      />
      <OpportunityScanner />
      <section className={c.handCheck} aria-labelledby="flip-manual-heading">
        <SectionHeading
          id="flip-manual-heading"
          title={
            <>
              Check one trade by <em>hand</em>
            </>
          }
          line="Type what you expect to pay and get. Nothing here loads from the market."
        />
        <TradeCalculator />
      </section>
      <CalculatorCta
        title={
          <>
            Found a flip worth <em>hauling</em>?
          </>
        }
        line="Weigh the cargo against your mount, count the trips and set aside silver for the risk."
        primary={{ href: "/tools/transporting", label: "Plan the haul" }}
        secondary={{ href: "/tools/market", label: "Market Explorer" }}
      />
    </div>
  );
}
