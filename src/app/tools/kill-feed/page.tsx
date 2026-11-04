import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { CombatFeed } from "@/components/combat-feed";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/kill-feed", await searchParams);
}
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <CombatFeed mode={view === "deaths" ? "deaths" : "kills"} />;
}
