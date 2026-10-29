import { BuildRegionInput } from "@/components/build-region-link";
import Link from "@/components/build-region-link";
import { queryLibraryBuilds } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { LibraryBuildCard } from "@/components/library-build-card";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { SaveBuildFilter, SavedBuildFilters } from "@/components/build-device-collections";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { ItemIcon } from "@/components/item-icon";
import { buildDiscovery } from "@/lib/build-discovery";
import { BuildDiscoverySearch } from "@/components/build-discovery-search";
import { LayoutGrid, List, Search, Swords, X } from "lucide-react";
export const metadata = { title: "Albion Online builds" };
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
  const { rows, total, matched, categories, pages, page } = await queryLibraryBuilds({
    q,
    category,
    family,
    weapon: selectedWeapon?.name || (!weapon ? "" : weapon),
    tag,
    sort,
    page: Number.parseInt(str("page")) || 1,
  });
  const query = { q, category, family, weapon, tag, sort, view };
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
      <BuildDiscoveryHeader active={view === "saved" ? "saved" : "browse"} />
      {view === "saved" ? (
        <SavedBuildFilters />
      ) : (
        <div className="ecosystem-discovery-layout">
          <aside className="ecosystem-filter-rail">
            <MobileFilterPanel drawer>
              <form
                id="library-discovery-query"
                action="/builds/library"
                className="ecosystem-filter-form"
              >
                <BuildRegionInput />
                <input type="hidden" name="view" value={view} />
                <BuildDiscoverySearch value={q} formId="library-discovery-query" />
                <fieldset>
                  <legend>
                    <Swords size={15} />
                    Weapon
                  </legend>
                  <Link
                    className="ecosystem-family-option"
                    href={href({ family: "", weapon: "", page: "1" })}
                    aria-current={!family && !weapon ? "true" : undefined}
                  >
                    <span>All weapons</span>
                    <span className="numeric">{total.toLocaleString("en-GB")}</span>
                  </Link>
                  <div className="ecosystem-family-list">
                    {buildDiscovery.families.map((f) => (
                      <Link
                        className="ecosystem-family-option"
                        key={f.id}
                        href={href({ family: f.id, weapon: "", page: "1" })}
                        aria-current={family === f.id ? "true" : undefined}
                      >
                        <ItemIcon
                          id={buildDiscovery.weapons.find((w) => w.family === f.id)?.itemId || ""}
                          size={23}
                        />
                        <span>{f.name}</span>
                        <span className="numeric">{f.count.toLocaleString("en-GB")}</span>
                      </Link>
                    ))}
                  </div>
                  <label>
                    Specific weapon
                    <select
                      name="weapon"
                      defaultValue={selectedWeapon?.name || weapon}
                      aria-label="Library weapon"
                    >
                      <option value="">Any weapon in family</option>
                      {buildDiscovery.weapons
                        .filter((w) => !family || w.family === family)
                        .map((w) => (
                          <option value={w.name} key={`${w.code}:${w.name}`}>
                            {w.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <input type="hidden" name="family" value={family} />
                </fieldset>
                <fieldset>
                  <legend>Content type</legend>
                  <label className="sr-only" htmlFor="library-activity">
                    Activity
                  </label>
                  <select id="library-activity" name="category" defaultValue={category}>
                    <option value="">All activities</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {activityName(c)} (
                        {buildDiscovery.activities.find((a) => a.id === c)?.count || 0})
                      </option>
                    ))}
                  </select>
                </fieldset>
                <fieldset>
                  <legend>Playstyle tag</legend>
                  <label className="sr-only" htmlFor="library-playstyle">
                    Playstyle tag
                  </label>
                  <select id="library-playstyle" name="tag" defaultValue={tag}>
                    <option value="">All playstyles</option>
                    {buildDiscovery.tags.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.name} ({t.count})
                      </option>
                    ))}
                  </select>
                  <p>Tags recorded by build authors.</p>
                </fieldset>
                <button className="button primary" type="submit">
                  <Search size={15} />
                  Find builds
                </button>
                <Link className="text-link" href="/builds/library">
                  Reset filters
                </Link>
              </form>
            </MobileFilterPanel>
          </aside>
          <section className="ecosystem-results" aria-label="Matching library builds">
            <div className="ecosystem-result-toolbar">
              <div className="ecosystem-source-switch">
                <Link href="/builds/library" aria-current="page">
                  Library <span className="numeric">{total.toLocaleString("en-GB")}</span>
                </Link>
                <Link href="/builds">Community</Link>
              </div>
              <label className="ecosystem-sort-label">
                Sort
                <select
                  name="sort"
                  form="library-discovery-query"
                  defaultValue={sort}
                  aria-label="Sort library builds"
                >
                  <option value="">Library order</option>
                  <option value="newest">Recently updated</option>
                  <option value="title">Build title</option>
                </select>
              </label>
              <button
                form="library-discovery-query"
                className="button secondary ecosystem-apply-sort"
              >
                Apply
              </button>
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
            <div className="ecosystem-results-subline">
              <p>
                <strong>{matched.toLocaleString("en-GB")}</strong> matching builds ·{" "}
                {rows.length ? `${(page - 1) * 24 + 1}–${Math.min(page * 24, matched)}` : "0"} shown
              </p>
              <SaveBuildFilter path="/builds/library" query={query} />
            </div>
            {!!active.length && (
              <nav className="ecosystem-active-filters" aria-label="Active build filters">
                {active.map(([key, label]) => (
                  <Link
                    key={key}
                    href={href({ [key]: "", page: "1" })}
                    aria-label={`Remove ${label} filter`}
                  >
                    {label}
                    <X size={12} />
                  </Link>
                ))}
                <Link href="/builds/library">Clear all</Link>
              </nav>
            )}
            <div className="library-build-grid ecosystem-build-grid">
              {rows.map((build) => (
                <LibraryBuildCard key={build.id} build={build} />
              ))}
            </div>
            {!rows.length && (
              <div className="ecosystem-empty">
                <Swords size={30} />
                <h2>No loadouts match that search</h2>
                <p>Try another weapon, activity or playstyle. You can also clear a filter above.</p>
                <Link href="/builds/library" className="button secondary">
                  Clear filters
                </Link>
              </div>
            )}
            <nav className="library-pagination" aria-label="Library pages">
              {page > 1 ? (
                <Link className="button secondary" href={href({ page: String(page - 1) })}>
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {page.toLocaleString("en-GB")} / {pages.toLocaleString("en-GB")}
              </span>
              {page < pages ? (
                <Link className="button secondary" href={href({ page: String(page + 1) })}>
                  Next page
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
