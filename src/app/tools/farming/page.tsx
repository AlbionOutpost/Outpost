import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { FarmingCalculator } from "@/components/farming-calculator";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/farming", await searchParams);
}
export default function Page() {
  return (
    <div className="farming-page">
      <WorkspaceHeading
        glyph="farm"
        scene="economy"
        title="Farming calculator"
        description="Plan crops and herbs, compare watering, and separate cash profit from the value of retained seeds."
      />
      <FarmingCalculator />
    </div>
  );
}
