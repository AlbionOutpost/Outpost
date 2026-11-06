import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
import styles from "@/app/production-calculator.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/refining", await searchParams);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  const { recipe } = await searchParams;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="refine"
        scene="economy"
        title="Refining calculator"
        accent="Refining"
        description="Price raw resources against the refined output, set your return rate and see what a refining run makes."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="refining"
      />
    </div>
  );
}
