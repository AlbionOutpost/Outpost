import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Crafting calculator" };
export default function Page() {
  return (
    <div className="production-calculator-page crafting-reference-page">
      <WorkspaceHeading
        title="Crafting calculator"
        description="Plan. Calculate. Craft with confidence. Price your materials and see what your run could earn."
      />
      <ProductionCalculator kind="crafting" />
    </div>
  );
}
