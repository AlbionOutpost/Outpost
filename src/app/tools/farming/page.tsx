import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { FarmingCalculator } from "@/components/farming-calculator";
import { CalculatorCta } from "@/components/calculator-cta";
import styles from "@/app/production-calculator.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/farming", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="farm"
        scene="economy"
        title="Farming calculator"
        accent="Farming"
        description="Pick a crop or herb, plan the harvest and see what it makes, with the seeds you get back counted apart from cash."
      />
      <FarmingCalculator />
      <CalculatorCta
        title={
          <>
            Turning the harvest into <em>food</em>?
          </>
        }
        line="Price the meals and potions your crops and herbs go into before you sell them raw."
        primary={{ href: "/tools/cooking", label: "Open the cooking calculator" }}
        secondary={{ href: "/tools/alchemy", label: "Alchemy" }}
      />
    </div>
  );
}
