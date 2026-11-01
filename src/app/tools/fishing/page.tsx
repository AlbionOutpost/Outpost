import { WorkspaceHeading } from "@/components/workspace-heading";
import { FishingCalculator } from "@/components/fishing-calculator";
import { libraryFishing } from "@/lib/grind-library";
import Link from "@/components/link";
export const metadata = { title: "Fishing calculator" };
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <div className="fishing-page">
      <WorkspaceHeading
        glyph="fish"
        scene="economy"
        title="Fishing calculator"
        description="Compare selling whole fish, chopping for ingredients, and buying fishing fame."
      />
      <p className="fishing-guide-link">
        <Link className="text-link" href="/guides/fishing-leveling-guide">
          Read the fishing guide →
        </Link>
      </p>
      <FishingCalculator
        fish={await libraryFishing()}
        initialMode={mode === "leveling" ? "leveling" : "chopping"}
      />
    </div>
  );
}
