import { WorkspaceHeading } from "@/components/workspace-heading";
import { FarmingCalculator } from "@/components/farming-calculator";
export const metadata = { title: "Farming calculator" };
export default function Page() {
  return (
    <div className="farming-page">
      <WorkspaceHeading
        title="Farming calculator"
        description="Plan crops and herbs, compare watering, and separate cash profit from the value of retained seeds."
      />
      <FarmingCalculator />
    </div>
  );
}
