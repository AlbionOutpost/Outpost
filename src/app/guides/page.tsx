import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { libraryGuides } from "@/lib/grind-library";
import { JsonLd } from "@/components/json-ld";
import { itemListLd } from "@/lib/structured-data";
import { GrindGuideDirectory } from "@/components/grind-guide-directory";
import { NextStepCards } from "@/components/next-step-cards";
import styles from "./guides.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/guides", await searchParams);
}

export default async function Guides({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category.slice(0, 100) : "";
  const guides = await libraryGuides();
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        emblem={<></>}
        scene="guides"
        title="Albion Online guides"
        accent="guides"
        description="Guides for progression, gathering, PvE, PvP, trading and crafting, and for using Outpost’s tools."
      />
      <JsonLd
        data={itemListLd(
          "Albion Online guides",
          guides.map((g) => ({
            name: g.title,
            path: `/guides/${encodeURIComponent(g.slug)}`,
          })),
        )}
      />
      <GrindGuideDirectory guides={guides} query={query} category={category} />
      <AdSlot placement="hub" />
      <NextStepCards
        id="guides-next"
        title={
          <>
            Take it into your next <em>run</em>
          </>
        }
        line="Track your journal, pick a loadout for the content, or price the trip."
        link={{ href: "/tools", label: "All tools" }}
        cards={[
          {
            href: "/guides/albion-journal-guide",
            emblem: "tool-planner",
            title: "Journal tracker",
            line: "Every journal objective in one list, ticked off as you go.",
            scene: "city",
          },
          {
            href: "/builds/activities",
            emblem: "strip-builds",
            title: "Builds by activity",
            line: "Loadouts players run for each kind of content.",
            scene: "build",
          },
          {
            href: "/tools/market",
            emblem: "tool-market",
            title: "Market Explorer",
            line: "Prices in every city, so you know where to buy and where to dump.",
            scene: "market",
          },
        ]}
      />
    </div>
  );
}
