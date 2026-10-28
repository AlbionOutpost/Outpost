import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export default function Page() {
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
        title="Enchanting calculator"
        description="Compare upgrade paths, ingredient costs and the value of your finished equipment."
      />
      <ProductionCalculator kind="enchanting" />
    </div>
  );
}
