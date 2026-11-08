import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { parseCraftLink } from "@/lib/albion/craft-link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator, ProductionModes } from "@/components/production-calculator";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/crafting", await searchParams);
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
        glyph="craft"
        scene="economy"
        title="Crafting calculator"
        accent="Crafting"
        description="Pick a recipe, price the materials where you buy them and see what the run makes after tax and returns."
        actions={<ProductionModes current="crafting" />}
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        initialSettings={parseCraftLink(params)}
        kind="crafting"
      />
    </div>
  );
}
