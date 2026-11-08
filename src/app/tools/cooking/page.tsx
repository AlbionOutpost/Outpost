import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { parseCraftLink } from "@/lib/albion/craft-link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator, ProductionModes } from "@/components/production-calculator";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/cooking", await searchParams);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const recipe = params.recipe;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        compact
        glyph="cook"
        scene="economy"
        title="Cooking calculator"
        accent="Cooking"
        description="Price the ingredients for a batch of meals and see what is left after costs and tax."
        actions={<ProductionModes current="cooking" />}
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        initialSettings={parseCraftLink(params)}
        kind="crafting"
        category="cooking"
      />
    </div>
  );
}
