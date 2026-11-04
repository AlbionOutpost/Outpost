import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/enchanting", await searchParams);
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
        glyph="enchant"
        scene="economy"
        title="Enchanting calculator"
        description="Compare upgrade paths, ingredient costs and the value of your finished equipment."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="enchanting"
      />
    </div>
  );
}
