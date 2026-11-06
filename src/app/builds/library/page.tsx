import { BuildsNextStep } from "@/components/builds-next-step";
import { WellSelect } from "@/components/well-select";
import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import { BuildRegionInput } from "@/components/build-region-link";
import Link from "@/components/build-region-link";
import { featuredLibraryBuilds, queryLibraryBuilds } from "@/lib/grind-library";
import { SectionHeading } from "@/components/section-heading";
import { activityName } from "@/lib/grind-library-types";
import { LibraryBuildCard } from "@/components/library-build-card";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { SaveBuildFilter, SavedBuildFilters } from "@/components/build-device-collections";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { BuildWeaponRail } from "@/components/build-weapon-rail";
import { buildDiscovery } from "@/lib/build-discovery";
import { BuildDiscoverySearch } from "@/components/build-discovery-search";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { BuildSortSelect } from "@/components/build-sort-select";
import { EmptyWell } from "@/components/empty-well";
import { Pagination } from "@/components/pagination";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/builds/library", await searchParams);
}
export default async function Library({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    str = (key: string) => (typeof params[key] === "string" ? params[key].slice(0, 100) : "");
  const q = str("q").trim(),
    category = str("category"),
    family = str("family"),
    weapon = str("weapon"),
    tag = str("tag"),
    sort = ["title", "newest"].includes(str("sort")) ? str("sort") : "",
    view = ["list", "saved"].includes(str("view")) ? str("view") : "grid";
  const selectedWeapon =
    buildDiscovery.weapons.find((w) => w.name === weapon) ||
    buildDiscovery.weapons.find((w) => w.code === weapon);
  const { rows, matched, categories, pages, page } = await queryLibraryBuilds({
    q,
    category,
    family,
    weapon: selectedWeapon?.name || (!weapon ? "" : weapon),
    tag,
    sort,
    page: Number.parseInt(str("page")) || 1,
  });
  const query = { q, category, family, weapon, tag, sort, view };
  // An empty search still hands the player something to open.
  const picks = rows.length ? [] : (await featuredLibraryBuilds()).slice(0, 3);
  const href = (patch: Record<string, string>) =>
    `/builds/library?${new URLSearchParams({ ...query, ...patch })}`;
  const active = [
    q && ["q", `Search: ${q}`],
    category && ["category", activityName(category)],
    family && ["family", buildDiscovery.families.find((f) => f.id === family)?.name || family],
    weapon && ["weapon", selectedWeapon?.name || weapon],
    tag && ["tag", buildDiscovery.tags.find((t) => t.value === tag)?.name || tag],
  ].filter(Boolean) as string[][];
  return (
    <div className={`builds-ecosystem library-page ecosystem-library-page view-${view}`}>
      <BuildDiscoveryHeader
        active={view === "saved" ? "saved" : "browse"}
        title="Build library"
        accent="library"
        description="Find a loadout by weapon, activity or author. Copy it and make it yours."
      />
      {view === "saved" ? (
        <SavedBuildFilters />
      ) : (
        <div className="ecosystem-discovery-layout library-discovery-workspace">
          <div className="raised library-search-toolbar">
            <BuildDiscoverySearch
              value={q}
              formId="library-discovery-query"
              placeholder="Search weapons, builds or authors…"
              compact
            />
            <label className="ecosystem-sort-label">
              Sort
              <BuildSortSelect
                key={sort}
                name="sort"
                form="library-discovery-query"
                defaultValue={sort}
                aria-label="Sort library builds"
              >
                <option value="">Library order</option>
                <option value="newest">Recently updated</option>
                <option value="title">Build title</option>
              </BuildSortSelect>
            </label>
            <div className="ecosystem-view-switch" aria-label="Build layout">
              <Link
                href={href({ view: "grid" })}
                aria-label="Grid view"
                aria-current={view === "grid" ? "true" : undefined}
              >
                <LayoutGrid size={17} />
              </Link>
              <Link
                href={href({ view: "list" })}
                aria-label="List view"
                aria-current={view === "list" ? "true" : undefined}
              >
                <List size={17} />
              </Link>
            </div>
          </div>
          <aside className="raised ecosystem-filter-rail">
            <MobileFilterPanel
              drawer
              label={active.length ? `Filter builds (${active.length})` : "Filter builds"}
            >
              <form
                key={`${family}:${weapon}:${category}:${tag}:${view}`}
                id="library-discovery-query"
                action="/builds/library"
                className="ecosystem-filter-form"
              >
                <BuildRegionInput />
                <input type="hidden" name="view" value={view} />
                <BuildWeaponRail
                  selected={family}
                  families={buildDiscovery.families}
                  weapons={buildDiscovery.weapons.filter((w) => w.count > 0)}
                  total={buildDiscovery.families.reduce((sum, f) => sum + f.count, 0)}
                  query={query}
                />
                <label>
                  Specific weapon
                  <WellSelect
                    name="weapon"
                    defaultValue={selectedWeapon?.name || weapon}
                    aria-label="Library weapon"
                  >
                    <option value="">All weapons</option>
                    {buildDiscovery.weapons
                      .filter((w) => w.count > 0)
                      .map((w) => (
                        <option value={w.name} key={`${w.code}:${w.name}`}>
                          {w.name}
                        </option>
                      ))}
                  </WellSelect>
                </label>
                <fieldset>
                  <legend>Content type</legend>
                  <label className="sr-only" htmlFor="library-activity">
                    Activity
                  </label>
                  <WellSelect id="library-activity" name="category" defaultValue={category}>
                    <option value="">All activities</option>
                    {category && !categories.includes(category) && (
                      <option value={category}>{activityName(category)} (0)</option>
                    )}
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {activityName(c)} (
                        {buildDiscovery.activities.find((a) => a.id === c)?.count || 0})
                      </option>
                    ))}
                  </WellSelect>
                </fieldset>
                <fieldset>
                  <legend>Playstyle tag</legend>
                  <label className="sr-only" htmlFor="library-playstyle">
                    Playstyle tag
                  </label>
                  <WellSelect id="library-playstyle" name="tag" defaultValue={tag}>
                    <option value="">All playstyles</option>
                    {buildDiscovery.tags.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.name} ({t.count})
                      </option>
                    ))}
                  </WellSelect>
                </fieldset>
                <div className="library-filter-actions">
                  <button className="button primary" type="submit">
                    <Search size={15} />
                    Find builds
                  </button>
                  <Link className="pill-link is-small" href="/builds/library">
                    Reset filters
                  </Link>
                </div>
              </form>
            </MobileFilterPanel>
          </aside>
          <section className="ecosystem-results" aria-label="Matching library builds">
            <div className="ecosystem-results-subline" aria-live="polite" aria-atomic="true">
              <p>
                <strong>{matched.toLocaleString("en-GB")}</strong>{" "}
                {matched === 1 ? "library build" : "library builds"}
                {rows.length > 0 &&
                  ` · ${(page - 1) * 24 + 1}–${Math.min(page * 24, matched)} shown`}
              </p>
              <SaveBuildFilter path="/builds/library" query={query} />
            </div>
            {!!active.length && (
              <nav className="ecosystem-active-filters" aria-label="Active build filters">
                {active.map(([key, label]) => (
                  <Link
                    key={key}
                    className="landing-chip"
                    href={href({ [key]: "", page: "1" })}
                    aria-label={`Remove ${label} filter`}
                  >
                    {label}
                    <X size={12} />
                  </Link>
                ))}
                <Link className="pill-link is-small" href="/builds/library">
                  Clear all
                </Link>
              </nav>
            )}
            <div className="library-build-grid ecosystem-build-grid">
              {rows.map((build) => (
                <LibraryBuildCard key={build.id} build={build} />
              ))}
            </div>
            {!rows.length && (
              <EmptyWell
                emblem="strip-builds"
                title="No loadouts match that search"
                line="Try another weapon, activity or playstyle, or remove a filter above."
                action={
                  <Link href="/builds/library" className="button secondary">
                    Clear filters
                  </Link>
                }
              />
            )}
            {picks.length > 0 && (
              <section className="build-library-picks" aria-labelledby="library-picks-heading">
                <SectionHeading
                  id="library-picks-heading"
                  title={
                    <>
                      Start from <em>these</em>
                    </>
                  }
                  line="Featured library builds, while you change the search."
                  link={{ href: "/builds/library", label: "All library builds" }}
                />
                <div className="ecosystem-build-grid">
                  {picks.map((build) => (
                    <LibraryBuildCard key={build.id} build={build} />
                  ))}
                </div>
              </section>
            )}
            {rows.length > 0 && <AdSlot placement="hub" />}
            <Pagination
              label="Library pages"
              page={page}
              pages={pages}
              href={(n) => href({ page: String(n) })}
            />
          </section>
        </div>
      )}
      <BuildsNextStep
        title={
          <>
            Make <em>your</em> version
          </>
        }
        line="Start from any of these loadouts, swap the pieces you want and keep it on your account."
        secondary={{ href: "/builds", label: "Community builds" }}
      />
    </div>
  );
}
