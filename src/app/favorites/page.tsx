import "@/app/build-styles";
import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import Link from "@/components/build-region-link";
import { BuildRegionInput } from "@/components/build-region-link";
import { authOptions } from "@/lib/auth";
import { listAccountFavorites } from "@/lib/builds/discovery-service";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { DeviceLibraryFavorites } from "@/components/build-device-collections";
import { CommunityBuildCard } from "@/components/community-build-card";
import { BuildDiscoverySearch } from "@/components/build-discovery-search";
import { BuildSortSelect } from "@/components/build-sort-select";
import { EmptyWell } from "@/components/empty-well";
import { Pagination } from "@/components/pagination";
import { SectionHeading } from "@/components/section-heading";
import { ArrowRight, Layers, LayoutGrid, List } from "lucide-react";
import { z } from "zod";
import styles from "./favorites.module.css";
export const dynamic = "force-dynamic";
export const metadata = privateMetadata("Favorites");

export default async function Favorites({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    value = (key: string) => (typeof params[key] === "string" ? params[key].slice(0, 100) : ""),
    q = value("q").trim(),
    sort = value("sort") === "updated" ? "updated" : value("sort") === "title" ? "title" : "saved",
    view = value("view") === "list" ? "list" : "grid",
    parsePage = (key: string) =>
      z.coerce.number().int().min(1).max(10000).catch(1).parse(value(key)),
    requestedPage = parsePage("page"),
    requestedCompPage = parsePage("compPage"),
    query = { q, sort, view },
    href = (patch: Record<string, string>) =>
      `/favorites?${new URLSearchParams({ ...query, page: String(requestedPage), compPage: String(requestedCompPage), ...patch })}`,
    session = await getServerSession(authOptions),
    userId = session?.user?.id;
  // Public device favorites never cause anonymous private-account queries.
  const result = userId
    ? await listAccountFavorites(userId, {
        q,
        sort,
        page: requestedPage,
        compPage: requestedCompPage,
      })
    : null;
  const {
    builds = [],
    compositions = [],
    total = 0,
    compTotal = 0,
    page = 1,
    pages = 1,
    compPage = 1,
    compPages = 1,
  } = result || {};
  return (
    <div
      className={`builds-ecosystem ecosystem-favorites-page personal-favorites-collection view-${view}`}
    >
      <BuildDiscoveryHeader
        active="favorites"
        title="Your favorites"
        accent="favorites"
        description="The builds and comps you saved to come back to."
      />
      <div className="favorites-sections">
        <DeviceLibraryFavorites />
        <section className={`favorites-account ${styles.account}`} aria-label="Account favorites">
          {!userId ? (
            <div className="favorites-group">
              <SectionHeading
                title={
                  <>
                    Player builds and <em>comps</em>
                  </>
                }
                line="Kept on your Discord account, on every device."
              />
              <EmptyWell
                emblem="strip-comps"
                title="Sign in to see your saved player builds and comps"
                line="Player builds and comps you favorite are kept on your Discord account, on every device."
                action={
                  <Link href="/signin?callbackUrl=%2Ffavorites" className="button primary">
                    Sign in with Discord
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <section className="favorites-group" aria-labelledby="favorite-builds-heading">
                <SectionHeading
                  id="favorite-builds-heading"
                  title={
                    <>
                      Player <em>builds</em>
                    </>
                  }
                  line={`${total.toLocaleString("en-US")} saved to your account`}
                  link={total > 0 ? { href: "/builds", label: "Community builds" } : undefined}
                />
                {(total > 0 || q) && (
                  <form
                    id="favorite-build-query"
                    action="/favorites"
                    className="raised ecosystem-result-toolbar favorites-toolbar"
                  >
                    <BuildRegionInput />
                    <input type="hidden" name="view" value={view} />
                    <input type="hidden" name="compPage" value={compPage} />
                    <BuildDiscoverySearch
                      value={q}
                      formId="favorite-build-query"
                      label="Search favorite builds"
                      placeholder="Search saved build titles…"
                      compact
                    />
                    <label className="ecosystem-sort-label">
                      Sort
                      <BuildSortSelect
                        name="sort"
                        aria-label="Sort favorite builds"
                        defaultValue={sort}
                      >
                        <option value="saved">Recently favorited</option>
                        <option value="updated">Recently updated</option>
                        <option value="title">Title A–Z</option>
                      </BuildSortSelect>
                    </label>
                    <div
                      className="segmented ecosystem-view-switch"
                      aria-label="Favorite build layout"
                    >
                      <Link
                        href={href({
                          view: "grid",
                          page: String(page),
                          compPage: String(compPage),
                        })}
                        aria-label="Grid view"
                        aria-current={view === "grid" ? "true" : undefined}
                      >
                        <LayoutGrid size={17} />
                      </Link>
                      <Link
                        href={href({
                          view: "list",
                          page: String(page),
                          compPage: String(compPage),
                        })}
                        aria-label="List view"
                        aria-current={view === "list" ? "true" : undefined}
                      >
                        <List size={17} />
                      </Link>
                    </div>
                  </form>
                )}
                {builds.length > 0 && (
                  <div
                    className="account-build-grid"
                    role="group"
                    aria-label="Favorite player builds"
                  >
                    {builds.map(({ build }) => (
                      <CommunityBuildCard
                        key={build.id}
                        build={build}
                        authenticated
                        saved
                        favoriteCount={build._count.favorites}
                        owned={build.authorId === userId}
                      />
                    ))}
                  </div>
                )}
                {!builds.length && (
                  <EmptyWell
                    emblem="team-roles"
                    title={
                      q ? "No favorite builds match this search" : "No player builds saved yet"
                    }
                    line={
                      q
                        ? "Try another title or clear the search."
                        : "Use the heart on a player build to keep it with your account."
                    }
                    action={
                      q ? (
                        <Link className="button secondary" href={href({ q: "", page: "1" })}>
                          Clear search
                        </Link>
                      ) : (
                        <Link className="button secondary" href="/builds">
                          Community builds
                        </Link>
                      )
                    }
                  />
                )}
                <Pagination
                  label="Favorite build pages"
                  page={page}
                  pages={pages}
                  href={(n) => href({ page: String(n), compPage: String(compPage) })}
                />
              </section>
              <section className="favorites-group" aria-labelledby="favorite-comps-heading">
                <SectionHeading
                  id="favorite-comps-heading"
                  title={
                    <>
                      Saved <em>comps</em>
                    </>
                  }
                  line={`${compTotal.toLocaleString("en-US")} saved to your account`}
                  link={
                    compTotal > 0 ? { href: "/compositions", label: "Browse comps" } : undefined
                  }
                />
                {compositions.length > 0 ? (
                  <div className="favorite-compositions-list">
                    {compositions.map(({ composition: c }) => (
                      <Link key={c.id} href={`/compositions/${c.id}`}>
                        <Layers size={22} aria-hidden="true" />
                        <span>{c.title}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyWell
                    emblem="strip-comps"
                    title="No comps saved yet"
                    line="Add a comp to your favorites to keep it for your next group session."
                    action={
                      <Link className="button secondary" href="/compositions">
                        Browse comps
                      </Link>
                    }
                  />
                )}
                <Pagination
                  label="Favorite composition pages"
                  page={compPage}
                  pages={compPages}
                  href={(n) => href({ page: String(page), compPage: String(n) })}
                />
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
