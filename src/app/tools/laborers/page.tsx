import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { LaborersCalculator } from "@/components/laborers-calculator";
import { CalculatorCta } from "@/components/calculator-cta";
import styles from "@/app/production-calculator.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/laborers", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="labor"
        scene="economy"
        title="Laborers calculator"
        accent="Laborers"
        description="Price full journals and the loot they bring back, by laborer, journal tier and house, to see what a run makes."
      />
      <LaborersCalculator />
      <CalculatorCta
        title={
          <>
            Filling journals while you <em>craft</em>?
          </>
        }
        line="Crafting fills Blacksmith, Fletcher, Imbuer and Tinker journals. See what the craft itself makes first."
        primary={{ href: "/tools/crafting", label: "Open the crafting calculator" }}
      />
    </div>
  );
}
