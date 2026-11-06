import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { History } from "@/components/history";
import { MarketNextSteps } from "@/components/market-next-steps";
import styles from "./gold.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/gold", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="history"
        scene="market"
        title="Gold price"
        description="What gold costs in silver on your server, and how it moved over the last week."
      />
      <History kind="gold" autoLoad />
      <MarketNextSteps show={["market", "flipping", "crafting"]} />
    </div>
  );
}
