import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
import styles from "@/app/production-calculator.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/crafting", await searchParams);
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
        title="Crafting calculator"
        accent="Crafting"
        description="Pick a recipe, price the materials where you buy them and see what the run makes after tax and returns."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="crafting"
      />
    </div>
  );
}
