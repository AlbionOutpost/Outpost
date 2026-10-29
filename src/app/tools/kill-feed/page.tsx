import { CombatFeed } from "@/components/combat-feed";
export const metadata = { title: "Global kill feed" };
export default function Page() {
  return <CombatFeed mode="kills" />;
}
