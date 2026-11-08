import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { BlackMarketBoard } from "@/components/black-market-board";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/black-market", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        compact
        glyph="trade"
        scene="market"
        title="Black Market board"
        accent="Black Market"
        description="Which gear the Black Market pays more for than the cheapest city sells it, after your tax."
      />
      <BlackMarketBoard />
    </div>
  );
}
