import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MasteryPlanner } from "@/components/mastery-planner";
import { CalculatorCta } from "@/components/calculator-cta";
import styles from "@/components/calculator-shell.module.css";
import c from "@/app/calculators.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/mastery", await searchParams);
}
export default function Page() {
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
        title="Specialization & focus"
        accent="focus"
        description="Enter your crafting, refining, cooking and alchemy specs once. Every calculator uses them for focus cost."
      />
      <MasteryPlanner />
      <CalculatorCta
        title={
          <>
            Spend that <em>focus</em> well
          </>
        }
        line="Turn focus on in the crafting calculator to see what a run makes with your specs."
        primary={{ href: "/tools/crafting", label: "Open the crafting calculator" }}
        secondary={{ href: "/tools/refining", label: "Refining" }}
      />
    </div>
  );
}
