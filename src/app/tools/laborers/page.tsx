import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { LaborersCalculator } from "@/components/laborers-calculator";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/laborers", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        compact
        glyph="labor"
        scene="economy"
        title="Laborers calculator"
        accent="Laborers"
        description="Price full journals and the loot they bring back, by laborer, journal tier and house, to see what a run makes."
      />
      <LaborersCalculator />
    </div>
  );
}
