import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
import styles from "@/app/production-calculator.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/cooking", await searchParams);
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
        glyph="craft"
        scene="economy"
        title="Cooking calculator"
        accent="Cooking"
        description="Price the ingredients for a batch of meals and see what is left after costs and tax."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="crafting"
        category="cooking"
      />
    </div>
  );
}
