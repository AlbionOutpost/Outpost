import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AvalonMapper } from "@/components/avalon-mapper";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/avalon-mapper", await searchParams);
}
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        glyph="map"
        scene="roads"
        title="Roads of Avalon mapper"
        description="Track portal connections and their time left, and find the fewest-portal route home."
      />
      <AvalonMapper />
    </>
  );
}
