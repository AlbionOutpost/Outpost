import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { libraryGuides } from "@/lib/grind-library";
import { JsonLd } from "@/components/json-ld";
import { itemListLd } from "@/lib/structured-data";
import { GrindGuideDirectory } from "@/components/grind-guide-directory";
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
        description={`${guides.length} guides for progression, gathering, PvE, PvP, trading and crafting, and for using Outpost’s tools.`}
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
    </div>
  );
}
