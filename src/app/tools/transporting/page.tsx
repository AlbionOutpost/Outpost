import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { TransportCalculator } from "@/components/transport-calculator";
import { CalculatorCta } from "@/components/calculator-cta";
import styles from "@/components/calculator-shell.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/transporting", await searchParams);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
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
        scene="economy"
        title="Transport calculator"
        accent="Transport"
        description="Pick your cargo and route, price both ends and see what the haul makes after trips, risk and tax."
      />
      <TransportCalculator
        initial={{
          item: value("item"),
          from: value("from"),
          to: value("to"),
          quality: value("quality"),
        }}
      />
      <CalculatorCta
        title={
          <>
            Looking for something worth <em>hauling</em>?
          </>
        }
        line="The flipping scanner checks a whole route for items that sell for more in the other city."
        primary={{ href: "/tools/flipping", label: "Scan a route" }}
      />
    </div>
  );
}
