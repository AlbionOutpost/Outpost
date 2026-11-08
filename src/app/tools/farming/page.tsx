import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { FarmingCalculator } from "@/components/farming-calculator";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/farming", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        compact
        glyph="farm"
        scene="economy"
        title="Farming calculator"
        accent="Farming"
        description="Pick a crop or herb, plan the harvest and see what it makes, with the seeds you get back counted apart from cash."
      />
      <FarmingCalculator />
    </div>
  );
}
