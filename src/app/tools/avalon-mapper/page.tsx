import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AvalonMapper } from "@/components/avalon-mapper";
import { CalculatorCta } from "@/components/calculator-cta";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/avalon-mapper", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        emblem={
          // No painted emblem for this tool yet; the neutral seal stands in (batch 4 report)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="painted-emblem"
            src="/albion/icons/fame.webp"
            alt=""
            width={64}
            height={64}
          />
        }
        scene="roads"
        title="Roads of Avalon mapper"
        accent="Avalon"
        description="Save the portals your scout finds with their time left, and find the fewest-portal way home."
      />
      <AvalonMapper />
      <CalculatorCta
        title={
          <>
            Bringing the loot <em>home</em>?
          </>
        }
        line="Check what the chests and gathered resources sell for before you choose where to sell them."
        primary={{ href: "/tools/market", label: "Open Market Explorer" }}
        secondary={{ href: "/tools/transporting", label: "Transport calculator" }}
      />
    </div>
  );
}
