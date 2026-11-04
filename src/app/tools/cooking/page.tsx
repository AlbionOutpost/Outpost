import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
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
    <div className="production-calculator-page">
      <WorkspaceHeading
        glyph="craft"
        scene="economy"
        title="Cooking calculator"
        description="A better plan for every meal. Price ingredients, set your batch and compare the silver left after costs."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="crafting"
        category="cooking"
      />
    </div>
  );
}
