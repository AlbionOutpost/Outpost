import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MasteryPlanner } from "@/components/mastery-planner";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/mastery", await searchParams);
}
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        glyph="mastery"
        scene="economy"
        title="Specialization & focus"
        description="Enter your crafting, refining, cooking and alchemy specs once; every calculator uses them for focus cost."
      />
      <MasteryPlanner />
    </>
  );
}
