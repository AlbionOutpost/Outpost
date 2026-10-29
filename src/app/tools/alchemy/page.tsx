import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Alchemy calculator" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  const { recipe } = await searchParams;
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
        title="Alchemy calculator"
        description="Make every ingredient count. Price your potions, plan your purchases and review your batch profit."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="crafting"
        category="alchemy"
      />
    </div>
  );
}
