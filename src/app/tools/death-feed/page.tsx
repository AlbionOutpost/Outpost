import { CombatFeed } from "@/components/combat-feed";
export const metadata = { title: "Global death feed" };
export default function Page() {
  return <CombatFeed mode="deaths" />;
}
