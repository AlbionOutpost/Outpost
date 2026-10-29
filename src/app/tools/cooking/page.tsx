import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Cooking calculator" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  const { recipe } = await searchParams;
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
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
