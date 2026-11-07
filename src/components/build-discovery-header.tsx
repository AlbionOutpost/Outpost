import Link from "./build-region-link";
import { Compass, UserRound, Bookmark, SlidersHorizontal, Plus, LayoutGrid } from "lucide-react";
import { MastheadTabs } from "./masthead-tabs";
import { WorkspaceHeading } from "./workspace-heading";

/** The Builds masthead: title, one line, the collections as tabs and the create action. */
export function BuildDiscoveryHeader({
  active = "browse",
  title,
  accent,
  description,
}: {
  active?: "browse" | "activities" | "mine" | "favorites" | "saved";
  title?: string;
  /** One word of the title in ember, as on the landing. */
  accent?: string;
  description?: string;
}) {
  const current = (id: string) => active === id;
  return (
    <WorkspaceHeading
      glyph="builds"
      scene="builds"
      title={title || "Albion Online Builds"}
      accent={accent}
      description={
        description ||
        "Find your next playstyle. Explore equipment, abilities and alternatives for every adventure."
      }
      actions={
        <Link className="button primary" href="/builds/new">
          <Plus size={16} />
          Create a build
        </Link>
      }
    >
      <MastheadTabs
        label="Build collections"
        tabs={[
          {
            href: "/builds/activities",
            label: "Activities",
            icon: <LayoutGrid size={16} />,
            current: current("activities"),
          },
          {
            href: "/builds",
            label: "All builds",
            icon: <Compass size={16} />,
            current: current("browse"),
          },
          {
            href: "/builds?mine=1",
            label: "My Builds",
            icon: <UserRound size={16} />,
            current: current("mine"),
          },
          {
            href: "/favorites",
            label: "Favorites",
            icon: <Bookmark size={16} />,
            current: current("favorites"),
          },
          {
            href: "/builds?view=saved",
            label: "Saved Filters",
            icon: <SlidersHorizontal size={16} />,
            current: current("saved"),
          },
        ]}
      />
    </WorkspaceHeading>
  );
}
