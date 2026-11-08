import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { History } from "@/components/history";
import { MarketNextSteps } from "@/components/market-next-steps";
import styles from "./gold.module.css";
import marketPage from "@/components/market-page.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/gold", await searchParams);
}
export default function Page() {
  return (
    <div className={`${styles.page} ${marketPage.page}`}>
      <WorkspaceHeading
        compact
        glyph="history"
        scene="market"
        title="Gold price"
        accent="price"
        description="What gold costs in silver on your server, and how it moved over the last week."
      />
      <History kind="gold" autoLoad />
      <MarketNextSteps
        show={["market", "crafting", "planner"]}
        title={
          <>
            Put the silver to <em>work</em>
          </>
        }
        line="See what your silver buys in each city, or whether a craft pays, before you trade gold for it."
      />
    </div>
  );
}
