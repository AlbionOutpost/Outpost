import { FishingCalculator } from "@/components/fishing-calculator";
import { libraryFishing } from "@/lib/grind-library";
import Link from "next/link";
export const metadata = { title: "Fishing calculator" };
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <div className="fishing-page">
      <h1 className="page-title display-title">Fishing calculator</h1>
      <p className="intro">
        Sell your catch whole, chop it for ingredients, or turn it into fishing fame. Find the
        trade-off that suits your next run.
      </p>
      <p className="fishing-guide-link">
        <Link className="text-link" href="/guides/fishing-leveling-guide">
          Read the fishing guide →
        </Link>
      </p>
      <FishingCalculator
        fish={libraryFishing()}
        initialMode={mode === "leveling" ? "leveling" : "chopping"}
      />
    </div>
  );
}
