import { ArrowLeftRight, ScanSearch } from "lucide-react";
import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { OpportunityScanner } from "@/components/opportunity-scanner";
import { TradeCalculator } from "@/components/trade-calculator";
import { PageView, PageViewTabs, PageViews } from "@/components/page-views";
import styles from "@/components/calculator-shell.module.css";
import { HowItWorks } from "@/components/how-it-works";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/flipping", await searchParams);
}
export default function Page() {
  return (
    <>
      <div className={styles.page}>
        <PageViews id="flip" initial="scan" hashViews={{ "#scenario": "trade", "#trade": "trade" }}>
          <WorkspaceHeading
            glyph="trade"
            scene="market"
            title="Market flipping"
            accent="flipping"
            description="Scan a route for items that sell for more in the other city, or check one trade with your own prices and fees."
            actions={
              <PageViewTabs
                label="Flipping tools"
                views={[
                  {
                    key: "scan",
                    label: "Scan a route",
                    icon: <ScanSearch size={16} aria-hidden="true" />,
                  },
                  {
                    key: "trade",
                    label: "Check one trade",
                    icon: <ArrowLeftRight size={16} aria-hidden="true" />,
                  },
                ]}
              />
            }
          />
          <PageView view="scan">
            <OpportunityScanner />
          </PageView>
          <PageView view="trade">
            <TradeCalculator />
          </PageView>
        </PageViews>
      </div>
      <HowItWorks path="/tools/flipping" />
    </>
  );
}
