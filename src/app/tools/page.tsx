import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { ToolDirectory } from "@/components/tool-directory";
import styles from "./tools.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools", await searchParams);
}
export default function Tools() {
  return (
    <div className={styles.catalogue}>
      <ToolDirectory />
    </div>
  );
}
