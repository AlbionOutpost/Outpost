import { Layers, UserRound, Users } from "lucide-react";
import { MastheadTabs } from "./masthead-tabs";

/** The comp collections, the same tabs under every comp hub's masthead. */
export function CompTabs({ current }: { current: "library" | "player" | "mine" }) {
  return (
    <MastheadTabs
      label="Comp collections"
      tabs={[
        {
          href: "/compositions/library",
          label: "Group Builds",
          icon: <Layers size={16} />,
          current: current === "library",
        },
        {
          href: "/compositions",
          label: "Player comps",
          icon: <Users size={16} />,
          current: current === "player",
        },
        {
          href: "/compositions?mine=1",
          label: "My comps",
          icon: <UserRound size={16} />,
          current: current === "mine",
        },
      ]}
    />
  );
}
