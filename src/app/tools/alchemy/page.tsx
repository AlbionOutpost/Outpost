import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Alchemy calculator" };
export default function Page() {
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
        title="Alchemy calculator"
        description="Make every ingredient count. Price your potions, plan your purchases and review your batch profit."
      />
      <ProductionCalculator kind="crafting" category="alchemy" />
    </div>
  );
}
