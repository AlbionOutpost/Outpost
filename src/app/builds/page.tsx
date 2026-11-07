import { BuildsNextStep } from "@/components/builds-next-step";
import { WellSelect } from "@/components/well-select";
import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import { BuildRegionInput } from "@/components/build-region-link";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { CommunityBuildCard } from "@/components/community-build-card";
import { LibraryBuildCard } from "@/components/library-build-card";
import { BuildSortSelect } from "@/components/build-sort-select";
import { EmptyWell } from "@/components/empty-well";
import { Pagination } from "@/components/pagination";
import { SectionHeading } from "@/components/section-heading";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { BuildDiscoverySearch } from "@/components/build-discovery-search";
import { SaveBuildFilter, SavedBuildFilters } from "@/components/build-device-collections";
import { BuildWeaponRail } from "@/components/build-weapon-rail";
import { buildDiscovery } from "@/lib/build-discovery";
import { featuredLibraryBuilds, queryLibraryBuilds } from "@/lib/grind-library";
import { listAccountBuilds } from "@/lib/builds/discovery-service";
import {
  activityForContent,
  activityLabel,
  activityOptions,
  libraryActivity,
  playerContent,
  sliceOfPages,
  splitPage,
  type Source,
} from "@/lib/source-filter";
import Link from "@/components/build-region-link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { LayoutGrid, List, Search, X } from "lucide-react";
export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/builds", await searchParams);
}
const sources = [
  ["", "All"],
  ["player", "Community"],
  ["library", "Library"],
] as const;
/** The sort a player picks, as each list understands it. */
const sorts = {
  popular: { label: "Most popular", player: "saved", library: "" },
  recent: { label: "Recently updated", player: "recent", library: "newest" },
  title: { label: "Build title", player: "title", library: "title" },
} as const;
type Sort = keyof typeof sorts;
const noBuilds = { builds: [], total: 0, page: 1, pages: 1 };
/**
 * Every build in one list: builds players published on Outpost (Community) and the archived
 * build library, filtered by source, weapon, activity, playstyle and search. "All" shows the
 * community builds first, then the library, each under its own heading with its own count.
 */
export default async function Builds({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    value = (key: string) => (typeof params[key] === "string" ? params[key].slice(0, 100) : "");
  const session = await getServerSession(authOptions),
    viewer = session?.user?.id || null,
    mine = value("mine") === "1",
    // My Builds are player builds; `community` is the source's name before the merge.
    source: Source = mine
      ? "player"
      : ["player", "community"].includes(value("source"))
        ? "player"
        : value("source") === "library"
          ? "library"
          : "",
    q = value("q").trim(),
    requested = z.coerce.number().int().min(1).max(10000).catch(1).parse(value("page")),
    view = ["list", "saved"].includes(value("view")) ? value("view") : "grid",
    family = buildDiscovery.families.some((f) => f.id === value("family")) ? value("family") : "",
    tag = buildDiscovery.tags.some((t) => t.value === value("tag")) ? value("tag") : "",
    // `content` and `sort=saved` are the community page's parameters before the merge.
    activity = value("category") || (value("content") ? activityForContent(value("content")) : ""),
    sort = value("sort") === "saved" ? "popular" : value("sort");
  const weapons = buildDiscovery.weapons.filter((w) => w.count > 0),
    // Weapons are named as the library names them; old community links carry the item code.
    picked =
      buildDiscovery.weapons.find((w) => w.name === value("weapon")) ||
      buildDiscovery.weapons.find((w) => w.code === value("weapon")),
    weapon = picked?.name || "",
    order: Sort = Object.hasOwn(sorts, sort) ? (sort as Sort) : "popular";
  const query = {
    source: source === "player" ? "community" : source,
    mine: mine ? "1" : "",
    q,
    family,
    weapon,
    category: activity,
    tag,
    sort: order === "popular" ? "" : order,
    view,
  };
  const saved = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams({ ...query, ...patch });
    for (const [key, v] of [...next]) if (!v) next.delete(key);
    return `/builds${next.size ? `?${next}` : ""}`;
  };
  const reset = mine
    ? "/builds?mine=1"
    : href({ q: "", family: "", weapon: "", category: "", tag: "", sort: "", page: "" });

  const libraryCategory = activity ? libraryActivity(activity) : "";
  const libraryOpen = source !== "player" && libraryCategory !== null;
  const content = activity ? playerContent(activity) : "";
  const playerOpen = source !== "library" && content !== null && !tag;
  const libraryPage = (page: number) =>
    queryLibraryBuilds({
      q,
      family,
      weapon,
      tag,
      category: libraryCategory || "",
      sort: sorts[order].library,
      page,
    });
  const codes = picked
    ? [picked.code]
    : family
      ? [...new Set(weapons.filter((w) => w.family === family).map((w) => w.code))]
      : [];
  const playerPage = (page: number) =>
    listAccountBuilds(viewer, {
      q,
      mine,
      content: content || "",
      codes,
      sort: sorts[order].player,
      page,
    });
  // The community list is one database read; the library is read only when it is shown.
  const [players, library] = await Promise.all([
    playerOpen ? playerPage(requested) : noBuilds,
    libraryOpen ? libraryPage(requested) : null,
  ]);
  const libraryTotal = library?.matched ?? 0;
  let page = 1,
    pages = 1,
    shownPlayers = players.builds,
    shownLibrary = library?.rows ?? [];
  if (source === "player") ({ page, pages } = players);
  else if (source === "library") ({ page, pages } = library ?? { page, pages });
  else {
    // One page holds 24 builds: the community's first, then the library's.
    const split = splitPage(requested, players.total, libraryTotal);
    ({ page, pages } = split);
    shownPlayers =
      split.playerTake && players.page !== page
        ? (await playerPage(page)).builds
        : players.builds.slice(0, split.playerTake);
    shownLibrary = library
      ? await sliceOfPages(libraryPage, split.libraryStart, split.libraryTake, 24, library)
      : [];
  }
  const total = players.total + libraryTotal;
  const shown = shownPlayers.length + shownLibrary.length,
    size = 24;
  const filtered = !!(q || family || weapon || activity || tag);
  // A quiet search still hands visitors something to play: the curated library.
  const picks = !shown && !mine ? (await featuredLibraryBuilds()).slice(0, 3) : [];
  const active = [
    q && ["q", `Search: ${q}`],
    activity && ["category", activityLabel(activity)],
    family && ["family", buildDiscovery.families.find((f) => f.id === family)?.name || family],
    weapon && ["weapon", weapon],
    tag && ["tag", buildDiscovery.tags.find((t) => t.value === tag)?.name || tag],
  ].filter(Boolean) as string[][];
  const options = activityOptions(
    source,
    buildDiscovery.activities.map((a) => a.id),
  );
  const libraryCount = (id: string) => buildDiscovery.activities.find((a) => a.id === id)?.count;
  const noun =
    source === "library" ? "library build" : source === "player" ? "community build" : "build";
  const playerGrid = (
    <div className="build-discovery-grid account-build-grid">
      {shownPlayers.map((b) => (
        <CommunityBuildCard
          key={b.id}
          build={b}
          authenticated={!!viewer}
          saved={b.favorites.length > 0}
          favoriteCount={b._count.favorites}
          owned={b.authorId === viewer}
        />
      ))}
    </div>
  );
  const libraryGrid = (
    <div className="build-discovery-grid account-build-grid">
      {shownLibrary.map((build) => (
        <LibraryBuildCard key={build.id} build={build} />
      ))}
    </div>
  );
  return (
    <div
      className={`builds-ecosystem ecosystem-library-page build-discovery-page ${mine ? "personal-build-collection" : ""} view-${view}`}
    >
      <BuildDiscoveryHeader
        active={view === "saved" ? "saved" : mine ? "mine" : "browse"}
        title={mine ? "My Builds" : "Albion Online builds"}
        accent="Builds"
        description={
          mine
            ? "Your loadouts and their revisions. Private builds stay visible only to you."
            : "Loadouts Outpost players published and the archived build library. Find one by weapon or activity, copy it and make it yours."
        }
      />
      {view === "saved" ? (
        <SavedBuildFilters />
      ) : mine && !viewer ? (
        <div className="build-signin-well">
          <EmptyWell
            emblem="strip-builds"
            title="Sign in to see your builds"
            line="Builds you create are kept on your Discord account. Device favourites work without signing in."
            action={
              <Link href="/signin" className="button primary">
                Sign in with Discord
              </Link>
            }
          />
        </div>
      ) : (
        <div className="ecosystem-discovery-layout library-discovery-workspace">
          <div className="raised library-search-toolbar">
            <BuildDiscoverySearch
              value={q}
              formId="build-discovery-query"
              placeholder="Search builds, weapons or authors…"
              compact
            />
            <label className="ecosystem-sort-label">
              Sort
              <BuildSortSelect
                key={order}
                form="build-discovery-query"
                name="sort"
                aria-label="Sort builds"
                defaultValue={query.sort}
              >
                {Object.entries(sorts).map(([id, s]) => (
                  <option key={id} value={id === "popular" ? "" : id}>
                    {s.label}
                  </option>
                ))}
              </BuildSortSelect>
            </label>
            <div className="segmented ecosystem-view-switch" aria-label="Build layout">
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
          <aside className="raised ecosystem-filter-rail" aria-label="Build filters">
            <MobileFilterPanel
              drawer
              label={active.length ? `Filter builds (${active.length})` : "Filter builds"}
            >
              <form
                key={`${source}:${family}:${weapon}:${activity}:${tag}:${mine}`}
                id="build-discovery-query"
                action="/builds"
                className="ecosystem-filter-form build-filter-form"
              >
                <BuildRegionInput />
                {query.source && <input type="hidden" name="source" value={query.source} />}
                {mine && <input type="hidden" name="mine" value="1" />}
                <input type="hidden" name="view" value={view} />
                <BuildWeaponRail
                  limit={8}
                  selected={family}
                  families={buildDiscovery.families}
                  weapons={weapons}
                  // The family counts are the library's; player builds have none.
                  total={
                    source === "library"
                      ? buildDiscovery.families.reduce((sum, f) => sum + f.count, 0)
                      : undefined
                  }
                  query={saved}
                />
                <label>
                  Specific weapon
                  <WellSelect name="weapon" defaultValue={weapon} aria-label="Filter build weapon">
                    <option value="">All weapons</option>
                    {weapons
                      .filter((w) => !family || w.family === family)
                      .map((w) => (
                        <option value={w.name} key={`${w.code}:${w.name}`}>
                          {w.name}
                        </option>
                      ))}
                  </WellSelect>
                </label>
                <label>
                  Activity
                  <WellSelect
                    id="library-activity"
                    name="category"
                    defaultValue={activity}
                    aria-label="Filter build activity"
                  >
                    <option value="">All activities</option>
                    {activity && !options.some((o) => o.value === activity) && (
                      <option value={activity}>{activityLabel(activity)}</option>
                    )}
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                        {source === "library" && libraryCount(o.value) !== undefined
                          ? ` (${libraryCount(o.value)})`
                          : ""}
                      </option>
                    ))}
                  </WellSelect>
                </label>
                {source !== "player" && (
                  <label>
                    Playstyle tag
                    <WellSelect name="tag" defaultValue={tag} aria-label="Filter build playstyle">
                      <option value="">All playstyles</option>
                      {buildDiscovery.tags.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.name}
                          {source === "library" ? ` (${t.count})` : ""}
                        </option>
                      ))}
                    </WellSelect>
                  </label>
                )}
                <div className="library-filter-actions">
                  <button className="button primary" type="submit">
                    <Search size={15} aria-hidden="true" />
                    Find builds
                  </button>
                  <Link className="pill-link is-small" href={reset}>
                    Reset filters
                  </Link>
                </div>
              </form>
            </MobileFilterPanel>
          </aside>
          <section
            className="build-discovery-results ecosystem-results"
            aria-label="Matching builds"
          >
            {!mine && (
              <nav className="segmented build-source-switch" aria-label="Build source">
                {sources.map(([id, label]) => (
                  <Link
                    key={id}
                    href={href({ source: id === "player" ? "community" : id, page: "" })}
                    aria-current={source === id ? "true" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            <div className="ecosystem-results-subline" aria-live="polite" aria-atomic="true">
              <p>
                <strong>{total.toLocaleString("en-GB")}</strong>{" "}
                {mine ? "of your builds match" : total === 1 ? noun : `${noun}s`}
                {source === "" &&
                  ` (${players.total.toLocaleString("en-GB")} community · ${libraryTotal.toLocaleString("en-GB")} library)`}
                {shown > 0 && ` · ${(page - 1) * size + 1}–${(page - 1) * size + shown} shown`}
              </p>
              <SaveBuildFilter path="/builds" query={saved} />
            </div>
            {!!active.length && (
              <nav className="ecosystem-active-filters" aria-label="Active build filters">
                {active.map(([key, label]) => (
                  <Link
                    key={key}
                    className="landing-chip"
                    href={href({ [key]: "", page: "" })}
                    aria-label={`Remove ${label} filter`}
                  >
                    {label}
                    <X size={12} aria-hidden="true" />
                  </Link>
                ))}
                <Link className="pill-link is-small" href={reset}>
                  Clear all
                </Link>
              </nav>
            )}
            {source === "" && shownPlayers.length > 0 && shownLibrary.length > 0 ? (
              <>
                <section className="build-source-group" aria-labelledby="community-builds-heading">
                  <SectionHeading
                    id="community-builds-heading"
                    title={
                      <>
                        Community <em>builds</em>
                      </>
                    }
                    line="Published by Outpost players."
                  />
                  {playerGrid}
                </section>
                <section className="build-source-group" aria-labelledby="library-builds-heading">
                  <SectionHeading
                    id="library-builds-heading"
                    title={
                      <>
                        From the <em>library</em>
                      </>
                    }
                    line="Archived builds, credited to the players who made them."
                  />
                  {libraryGrid}
                </section>
              </>
            ) : (
              <>
                {shownPlayers.length > 0 && playerGrid}
                {shownLibrary.length > 0 && libraryGrid}
              </>
            )}
            {!shown && (
              <EmptyWell
                emblem="strip-builds"
                title={
                  filtered
                    ? "No loadouts match that search"
                    : mine
                      ? "You have no builds yet"
                      : source === "player"
                        ? "No community builds yet"
                        : "No builds yet"
                }
                line={
                  filtered
                    ? source === "player" && tag === ""
                      ? "Try another weapon or activity, or clear the filters."
                      : "Try another weapon, activity or playstyle, or remove a filter above."
                    : mine
                      ? "Start from a library build or an empty board."
                      : "Players have not published a build yet. Start from the library below."
                }
                action={
                  filtered ? (
                    <Link href={reset} className="button secondary">
                      Clear filters
                    </Link>
                  ) : (
                    <Link href="/builds/new" className="button secondary">
                      Create a build
                    </Link>
                  )
                }
              />
            )}
            {picks.length > 0 && (
              <section
                className="build-library-picks"
                aria-labelledby="build-library-picks-heading"
              >
                <SectionHeading
                  id="build-library-picks-heading"
                  title={
                    <>
                      Start from <em>these</em>
                    </>
                  }
                  line="Featured library builds you can open and copy."
                  link={{ href: "/builds?source=library", label: "All library builds" }}
                />
                <div className="build-discovery-grid account-build-grid">
                  {picks.map((build) => (
                    <LibraryBuildCard key={build.id} build={build} />
                  ))}
                </div>
              </section>
            )}
            {shownLibrary.length > 0 && <AdSlot placement="hub" />}
            <Pagination
              label="Build pages"
              page={page}
              pages={pages}
              href={(n) => href({ page: String(n) })}
            />
          </section>
        </div>
      )}
      {mine ? (
        <BuildsNextStep
          title={
            <>
              Plan the <em>next</em> one
            </>
          }
          line="Start from an empty board or a library build, then put it in a comp for your Team."
          secondary={{ href: "/compositions", label: "Plan a comp" }}
        />
      ) : (
        <BuildsNextStep
          title={
            <>
              Publish <em>your</em> build
            </>
          }
          line="Start from any of these loadouts, or set a build to Public in the editor and it shows here for every player."
          secondary={{ href: "/builds/activities", label: "Builds by activity" }}
        />
      )}
    </div>
  );
}
