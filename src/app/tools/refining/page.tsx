import { WorkspaceHeading } from "@/components/workspace-heading";
import { ProductionCalculator } from "@/components/production-calculator";
export default function Page() {
  return (
    <div className="production-calculator-page">
      <WorkspaceHeading
        title="Refining calculator"
        description="Make every resource count. Compare material costs, station settings and the value of your refined output."
      />
      <ProductionCalculator kind="refining" />
    </div>
  );
}
