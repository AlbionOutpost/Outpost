import Link from "./build-region-link";
import { Swords, Compass, UserRound, Bookmark, SlidersHorizontal, Plus } from "lucide-react";
import { MastheadTabs } from "./masthead-tabs";
import { WorkspaceHeading } from "./workspace-heading";

/** The Builds masthead: title, one line, the collections as tabs and the create action. */
export function BuildDiscoveryHeader({
  active = "browse",
  source = "library",
  title,
  description,
}: {
  active?: "browse" | "mine" | "favorites" | "saved";
  source?: "library" | "community";
  title?: string;
  description?: string;
}) {
  const current = (id: string) => (active === "browse" ? source === id : active === id);
  return (
    <WorkspaceHeading
      glyph="builds"
      scene="builds"
      title={title || "Albion Online Builds"}
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
            href: "/builds/library",
            label: "Library",
            icon: <Compass size={16} />,
            current: current("library"),
          },
          {
            href: "/builds",
            label: "Community",
            icon: <Swords size={16} />,
            current: current("community"),
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
            href: "/builds/library?view=saved",
            label: "Saved Filters",
            icon: <SlidersHorizontal size={16} />,
            current: current("saved"),
          },
        ]}
      />
    </WorkspaceHeading>
  );
}
