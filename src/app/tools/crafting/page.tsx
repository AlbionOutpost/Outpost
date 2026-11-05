import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
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
    <div className="production-calculator-page crafting-reference-page">
      <WorkspaceHeading
        glyph="craft"
        scene="economy"
        title="Crafting calculator"
        description="Choose a recipe, price your materials and compare the costs, returns and profit of your run."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="crafting"
      />
    </div>
  );
}
