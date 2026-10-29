import Link from "./build-region-link";
import { Swords, Compass, UserRound, Bookmark, SlidersHorizontal, Plus } from "lucide-react";
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
  return (
    <header className="builds-ecosystem-header" data-source={source}>
      <div className="builds-heading-copy">
        <span className="builds-heading-mark">
          <Swords size={28} />
        </span>
        <div>
          <h1 className="page-title display-title">{title || "Albion Online Builds"}</h1>
          <p>
            {description ||
              "Find your next playstyle. Explore equipment, abilities and alternatives for every adventure."}
          </p>
        </div>
      </div>
      <div className="builds-header-bottom">
        <nav className="builds-collection-tabs" aria-label="Build collections">
          {[
            ["library", "/builds/library", "Library", Compass],
            ["community", "/builds", "Community", Swords],
            ["mine", "/builds?mine=1", "My Builds", UserRound],
            ["favorites", "/favorites", "Favorites", Bookmark],
            ["saved", "/builds/library?view=saved", "Saved Filters", SlidersHorizontal],
          ].map(([id, href, label, Icon]) => {
            const Glyph = Icon as typeof Swords;
            return (
              <Link
                key={String(id)}
                href={String(href)}
                aria-current={
                  (active === "browse" ? source === id : active === id) ? "page" : undefined
                }
              >
                <Glyph size={15} />
                {String(label)}
              </Link>
            );
          })}
        </nav>
        <Link className="button primary" href="/builds/new">
          <Plus size={15} />
          Create a build
        </Link>
      </div>
    </header>
  );
}
