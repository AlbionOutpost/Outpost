import Link from "./build-region-link";
import { Compass, LayoutGrid, Plus, UserRound } from "lucide-react";
import { MastheadTabs } from "./masthead-tabs";
import { WorkspaceHeading } from "./workspace-heading";

/** The Comps masthead, as Builds has it: title, one line, the collections as tabs and Create. */
export function CompDirectoryHeader({
  active,
  title,
  description,
}: {
  active: "activities" | "browse" | "mine";
  title: string;
  description: string;
}) {
  return (
    <WorkspaceHeading
      glyph="composition"
      scene="comps"
      title={title}
      accent={active === "activities" ? "activity" : "comps"}
      description={description}
      actions={
        <Link className="button primary" href="/compositions/new">
          <Plus size={16} aria-hidden="true" />
          Create a comp
        </Link>
      }
    >
      <MastheadTabs
        label="Comp collections"
        tabs={[
          {
            href: "/compositions/activities",
            label: "Activities",
            icon: <LayoutGrid size={16} />,
            current: active === "activities",
          },
          {
            href: "/compositions",
            label: "All comps",
            icon: <Compass size={16} />,
            current: active === "browse",
          },
          {
            href: "/compositions?mine=1",
            label: "My comps",
            icon: <UserRound size={16} />,
            current: active === "mine",
          },
        ]}
      />
    </WorkspaceHeading>
  );
}
