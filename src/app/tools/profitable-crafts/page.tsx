import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { CraftFinder } from "@/components/craft-finder";
import styles from "@/components/calculator-shell.module.css";
import { HowItWorks } from "@/components/how-it-works";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/profitable-crafts", await searchParams);
}
export default function Page() {
  return (
    <>
      <div className={styles.page}>
        <WorkspaceHeading
          glyph="craft"
          scene="economy"
          title="Profitable crafts"
          accent="crafts"
          description="Rank a category's recipes by profit for your cities, returns, tax and budget."
        />
        <CraftFinder />
      </div>
      <HowItWorks path="/tools/profitable-crafts" />
    </>
  );
}
