import { CombatFeed } from "@/components/combat-feed";
export const metadata = { title: "Global kill feed" };
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <CombatFeed mode={view === "deaths" ? "deaths" : "kills"} />;
}
