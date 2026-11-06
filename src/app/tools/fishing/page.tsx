import { ArrowRight } from "lucide-react";
import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { FishingCalculator } from "@/components/fishing-calculator";
import { CalculatorCta } from "@/components/calculator-cta";
import { libraryFishing } from "@/lib/grind-library";
import Link from "@/components/link";
import styles from "@/components/calculator-shell.module.css";
import c from "@/app/calculators.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/fishing", await searchParams);
}
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        emblem={
          // No painted emblem for this tool yet; the neutral seal stands in (batch 4 report)
          <span className={c.sealTile}>
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img src="/albion/icons/fame.webp" alt="" width={44} height={44} />
          </span>
        }
        scene="economy"
        title="Fishing calculator"
        accent="Fishing"
        description="See whether your catch is worth more chopped or whole, or what a fishing fame target costs."
        actions={
          <Link className="pill-link" href="/guides/fishing-leveling-guide">
            Fishing guide <ArrowRight size={15} aria-hidden="true" />
          </Link>
        }
      />
      <FishingCalculator
        fish={await libraryFishing()}
        initialMode={mode === "leveling" ? "leveling" : "chopping"}
      />
      <CalculatorCta
        title={
          <>
            Cooking with your <em>chops</em>?
          </>
        }
        line="Chopped fish goes into the best food in the game. Price the meal before you sell the chops."
        primary={{ href: "/tools/cooking", label: "Open the cooking calculator" }}
      />
    </div>
  );
}
