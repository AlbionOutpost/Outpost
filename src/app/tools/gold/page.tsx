import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { History } from "@/components/history";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/gold", await searchParams);
}
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        glyph="history"
        scene="market"
        title="Gold price history"
        description="Inspect regional gold observations and their timestamps. Choose your server in the navigation."
      />
      <History kind="gold" autoLoad />
    </>
  );
}
