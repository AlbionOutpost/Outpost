import { WorkspaceHeading } from "@/components/workspace-heading";
import { TransportCalculator } from "@/components/transport-calculator";
export const metadata = { title: "Transport calculator" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        title="Transport calculator"
        description="Compare city prices against cargo weight, carrying capacity, fees and your risk budget."
      />
      <TransportCalculator />
    </>
  );
}
