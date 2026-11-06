import { BuildsNextStep } from "@/components/builds-next-step";
import { WellSelect } from "@/components/well-select";
import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { BuildRegionInput } from "@/components/build-region-link";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { CommunityBuildCard } from "@/components/community-build-card";
import { BuildSortSelect } from "@/components/build-sort-select";
import { EmptyWell } from "@/components/empty-well";
import { Pagination } from "@/components/pagination";
import { SectionHeading } from "@/components/section-heading";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { BuildDiscoverySearch } from "@/components/build-discovery-search";
import { SaveBuildFilter } from "@/components/build-device-collections";
import { contentTypes } from "@/lib/builds/validation";
import { buildDiscovery } from "@/lib/build-discovery";
import Link from "@/components/build-region-link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAccountBuilds } from "@/lib/builds/discovery-service";
import { z } from "zod";
import { LayoutGrid, List, Search } from "lucide-react";
import { BuildWeaponRail } from "@/components/build-weapon-rail";
import { featuredLibraryBuilds } from "@/lib/grind-library";
import { LibraryBuildCard } from "@/components/library-build-card";
export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/builds", await searchParams);
}
export default async function Builds({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    value = (key: string) => (typeof params[key] === "string" ? params[key].slice(0, 100) : "");
  const q = value("q").trim(),
    requestedPage = z.coerce.number().int().min(1).max(10000).catch(1).parse(value("page")),
    session = await getServerSession(authOptions),
    mine = value("mine") === "1";
  const content = z
    .union([z.enum(contentTypes), z.literal("")])
    .catch("")
    .parse(value("content"));
  const weapon = buildDiscovery.weapons.some((w) => w.code === value("weapon"))
      ? value("weapon")
      : "",
    family = buildDiscovery.families.some((f) => f.id === value("family")) ? value("family") : "",
    sort = value("sort") === "saved" ? "saved" : "recent",
    view = value("view") === "list" ? "list" : "grid";
  const query = { q, mine: mine ? "1" : "0", content, weapon, family, sort, view };
  const href = (patch: Record<string, string>) =>
    `/builds?${new URLSearchParams({ ...query, ...patch })}`;
  const choices = [...new Map(buildDiscovery.weapons.map((w) => [w.code, w])).values()];
  const codes = weapon
    ? [weapon]
    : family
      ? [...new Set(choices.filter((w) => w.family === family).map((w) => w.code))]
      : [];
  const { builds, total, page, pages } = await listAccountBuilds(session?.user?.id || null, {
    q,
    mine,
    content,
    codes,
    sort,
    page: requestedPage,
  });
  const filtered = !!(q || codes.length || content);
  // A quiet community should still hand visitors something to play: the curated library.
  const libraryPicks = !builds.length && !mine ? (await featuredLibraryBuilds()).slice(0, 3) : [];
  return (
    <div
      className={`builds-ecosystem ecosystem-library-page build-discovery-page ${mine ? "personal-build-collection" : "community-build-collection"} view-${view}`}
    >
      <BuildDiscoveryHeader
        active={mine ? "mine" : "browse"}
        source="community"
        title={mine ? "My Builds" : "Community builds"}
        accent={mine ? "Builds" : "Community"}
        description={
          mine
            ? "Your loadouts and their revisions. Private builds stay visible only to you."
            : "Loadouts Outpost players have published. Find one to copy or post your own."
        }
      />
      {mine && !session?.user?.id ? (
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
              label="Search build titles"
              placeholder="Search build titles or authors…"
              compact
            />
            <label className="ecosystem-sort-label">
              Sort
              <BuildSortSelect
                form="build-discovery-query"
                name="sort"
                aria-label="Sort builds"
                defaultValue={sort}
              >
                <option value="recent">Recently updated</option>
                <option value="saved">Most saved</option>
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
            <MobileFilterPanel drawer label="Filter builds">
              <form
                key={`${family}:${weapon}:${content}:${mine}`}
                id="build-discovery-query"
                action="/builds"
                className="ecosystem-filter-form build-filter-form"
              >
                <BuildRegionInput />
                <input type="hidden" name="view" value={view} />
                <BuildWeaponRail
                  path="/builds"
                  limit={8}
                  selected={family}
                  families={buildDiscovery.families}
                  weapons={buildDiscovery.weapons.filter((w) => w.count > 0)}
                  query={query}
                />
                <label>
                  Collection
                  <WellSelect
                    name="mine"
                    defaultValue={mine ? "1" : "0"}
                    aria-label="Build collection"
                  >
                    <option value="0">Public builds</option>
                    <option value="1">My builds</option>
                  </WellSelect>
                </label>
                <label>
                  Content type
                  <WellSelect
                    name="content"
                    defaultValue={content}
                    aria-label="Filter build content"
                  >
                    <option value="">All activities</option>
                    {contentTypes.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </WellSelect>
                </label>
                <label>
                  Specific weapon
                  <WellSelect name="weapon" defaultValue={weapon} aria-label="Filter build weapon">
                    <option value="">All weapons</option>
                    {choices
                      .filter((w) => !family || w.family === family)
                      .map((w) => (
                        <option value={w.code} key={w.code}>
                          {w.name}
                        </option>
                      ))}
                  </WellSelect>
                </label>
                <div className="library-filter-actions">
                  <button className="button primary" type="submit">
                    <Search size={15} aria-hidden="true" />
                    Search builds
                  </button>
                  <Link className="pill-link is-small" href={mine ? "/builds?mine=1" : "/builds"}>
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
            <div className="ecosystem-results-subline">
              <p>
                <strong>{total.toLocaleString("en-GB")}</strong>{" "}
                {mine
                  ? "of your builds match"
                  : total === 1
                    ? "community build"
                    : "community builds"}
                {builds.length > 0 &&
                  ` · ${(page - 1) * 24 + 1}–${Math.min(page * 24, total)} shown`}
              </p>
              <SaveBuildFilter path="/builds" query={query} />
            </div>
            <div className="build-discovery-grid account-build-grid">
              {builds.map((b) => (
                <CommunityBuildCard
                  key={b.id}
                  build={b}
                  authenticated={!!session?.user?.id}
                  saved={b.favorites.length > 0}
                  favoriteCount={b._count.favorites}
                  owned={b.authorId === session?.user?.id}
                />
              ))}
            </div>
            {!builds.length && (
              <EmptyWell
                emblem="strip-builds"
                title={
                  filtered
                    ? "No matching loadouts"
                    : mine
                      ? "You have no builds yet"
                      : "No community builds yet"
                }
                line={
                  filtered
                    ? "Try another weapon or activity, or clear the filters."
                    : mine
                      ? "Start from a library build or an empty board."
                      : "Players have not published a build yet. Start from the library below."
                }
                action={
                  filtered ? (
                    <Link href={mine ? "/builds?mine=1" : "/builds"} className="button secondary">
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
            {libraryPicks.length > 0 && (
              <section
                className="build-library-picks"
                aria-labelledby="build-library-picks-heading"
              >
                <SectionHeading
                  id="build-library-picks-heading"
                  title={
                    <>
                      From the <em>library</em>
                    </>
                  }
                  line="Builds from the Outpost library you can open and copy."
                  link={{ href: "/builds/library", label: "All library builds" }}
                />
                <div className="build-discovery-grid account-build-grid">
                  {libraryPicks.map((build) => (
                    <LibraryBuildCard key={build.id} build={build} />
                  ))}
                </div>
              </section>
            )}
            <Pagination
              label="Community build pages"
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
          line="Set a build to Public in the editor and it shows here for every player on your server."
          secondary={{ href: "/builds/library", label: "Build library" }}
        />
      )}
    </div>
  );
}
