import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  const { recipe } = await searchParams;
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
        glyph="refine"
        scene="economy"
        title="Refining calculator"
        description="Make every resource count. Compare material costs, station settings and the value of your refined output."
      />
      <ProductionCalculator
        initialRecipeId={typeof recipe === "string" && recipe.length <= 100 ? recipe : undefined}
        kind="refining"
      />
    </div>
  );
}
