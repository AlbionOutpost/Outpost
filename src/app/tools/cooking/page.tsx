import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Cooking calculator" };
export default function Page() {
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
        title="Cooking calculator"
        description="A better plan for every meal. Price ingredients, set your batch and compare the silver left after costs."
      />
      <ProductionCalculator kind="crafting" category="cooking" />
    </div>
  );
}
