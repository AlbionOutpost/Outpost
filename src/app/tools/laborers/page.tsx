import { WorkspaceHeading } from "@/components/workspace-heading";
import { LaborersCalculator } from "@/components/laborers-calculator";
export const metadata = { title: "Laborers calculator" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        title="Laborers calculator"
        description="Expected loot from full journals by laborer, journal tier and house tier, priced at your market."
      />
      <LaborersCalculator />
    </>
  );
}
