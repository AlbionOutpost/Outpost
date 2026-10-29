import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Crafting calculator" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  const { recipe } = await searchParams;
  return (
    <div className="production-calculator-page crafting-reference-page">
      <WorkspaceHeading
        title="Crafting calculator"
        description="Plan. Calculate. Craft with confidence. Price your materials and see what your run could earn."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="crafting"
      />
    </div>
  );
}
