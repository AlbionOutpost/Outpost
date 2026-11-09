import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AvalonMapper } from "@/components/avalon-mapper";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/avalon-mapper", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="map"
        scene="roads"
        title="Roads of Avalon mapper"
        accent="Avalon"
        description="Save the portals your scout finds with their time left, and find the fewest-portal way home."
      />
      <AvalonMapper />
    </div>
  );
}
