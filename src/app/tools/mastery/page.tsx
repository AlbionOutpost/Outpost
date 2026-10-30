import { WorkspaceHeading } from "@/components/workspace-heading";
import { MasteryPlanner } from "@/components/mastery-planner";
export const metadata = { title: "Specialization & focus" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        title="Specialization & focus"
        description="Enter your crafting, refining, cooking and alchemy specs once; every calculator uses them for focus cost."
      />
      <MasteryPlanner />
    </>
  );
}
