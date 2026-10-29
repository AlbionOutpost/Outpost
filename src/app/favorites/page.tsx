import { getServerSession } from "next-auth";
import Link from "@/components/build-region-link";
import { BuildRegionInput } from "@/components/build-region-link";
import { authOptions } from "@/lib/auth";
import { listAccountFavorites } from "@/lib/builds/discovery-service";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { DeviceLibraryFavorites } from "@/components/build-device-collections";
import { BuildPreviewCard } from "@/components/build-preview-card";
import { BuildDiscoverySearch } from "@/components/build-discovery-search";
import { Layers, Cloud, LayoutGrid, List } from "lucide-react";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const metadata = { title: "Favorite builds" };
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
    <div className={`builds-ecosystem ecosystem-favorites-page view-${view}`}>
      <BuildDiscoveryHeader
        active="favorites"
        title="Your favorite builds"
        description="Keep the loadouts you want to return to. Library saves stay on this device; account favorites follow your sign-in."
      />
      <DeviceLibraryFavorites compactEmpty={!!userId} />
      <section aria-label="Account favorites">
        <div className="ecosystem-section-heading">
          <div>
            <h2>
              <Cloud size={19} />
              Account favorites
            </h2>
            <p>
              {userId
                ? "Your saved player builds and compositions. Content you can no longer access is hidden."
                : "Sign in to save player builds and compositions to your account."}
            </p>
          </div>
          {!userId && (
            <Link href="/signin" className="button secondary">
              Sign in with Discord
            </Link>
          )}
        </div>
        {userId && (
          <>
            <div className="ecosystem-section-heading">
              <h3>Player builds · {total}</h3>
              <Link href="/builds" className="text-link">
                Browse community builds →
              </Link>
            </div>
            <form
              id="favorite-build-query"
              action="/favorites"
              className="ecosystem-result-toolbar"
            >
              <BuildRegionInput />
              <input type="hidden" name="view" value={view} />
              <input type="hidden" name="compPage" value={compPage} />
              <BuildDiscoverySearch
                value={q}
                formId="favorite-build-query"
                label="Search favorite builds"
                placeholder="Search saved build titles…"
              />
              <label className="ecosystem-sort-label">
                Sort
                <select name="sort" aria-label="Sort favorite builds" defaultValue={sort}>
                  <option value="saved">Recently favorited</option>
                  <option value="updated">Recently updated</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
              <button className="button secondary" type="submit">
                Apply
              </button>
              <div className="ecosystem-view-switch" aria-label="Favorite build layout">
                <Link
                  href={href({ view: "grid", page: String(page), compPage: String(compPage) })}
                  aria-label="Grid view"
                  aria-current={view === "grid" ? "true" : undefined}
                >
                  <LayoutGrid size={17} />
                </Link>
                <Link
                  href={href({ view: "list", page: String(page), compPage: String(compPage) })}
                  aria-label="List view"
                  aria-current={view === "list" ? "true" : undefined}
                >
                  <List size={17} />
                </Link>
              </div>
            </form>
            <p className="ecosystem-results-subline">
              {total} matching favorite builds ·{" "}
              {builds.length ? `${(page - 1) * 24 + 1}–${Math.min(page * 24, total)}` : "0"} shown
            </p>
            <div className="account-build-grid" role="group" aria-label="Favorite player builds">
              {builds.map(({ build }) => (
                <BuildPreviewCard
                  key={build.id}
                  build={build}
                  authenticated
                  saved
                  favoriteCount={build._count.favorites}
                  owned={build.authorId === userId}
                />
              ))}
            </div>
            {!builds.length && (
              <div className="collection-empty ecosystem-empty">
                <h3>
                  {q
                    ? "No favorite builds match this search."
                    : "No saved builds you can access yet."}
                </h3>
                <p>
                  {q
                    ? "Try another title or clear your search."
                    : "Favorite a player build to keep it with your account."}
                </p>
                {q && (
                  <Link className="button secondary" href={href({ q: "", page: "1" })}>
                    Clear search
                  </Link>
                )}
                <Link className="button secondary" href="/builds">
                  Browse community builds
                </Link>
              </div>
            )}
            <nav className="library-pagination" aria-label="Favorite build pages">
              {page > 1 ? (
                <Link
                  className="button secondary"
                  href={href({ page: String(page - 1), compPage: String(compPage) })}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {page} / {pages}
              </span>
              {page < pages ? (
                <Link
                  className="button secondary"
                  href={href({ page: String(page + 1), compPage: String(compPage) })}
                >
                  Next page
                </Link>
              ) : (
                <span />
              )}
            </nav>
            <div className="ecosystem-section-heading">
              <h3>Compositions · {compTotal}</h3>
              <Link href="/compositions" className="text-link">
                Browse comps →
              </Link>
            </div>
            <div className="favorite-compositions-list">
              {compositions.map(({ composition: c }) => (
                <Link key={c.id} href={`/compositions/${c.id}`}>
                  <Layers size={22} />
                  <span>{c.title}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
            {!compositions.length && (
              <div className="collection-empty ecosystem-empty">
                <h3>No saved comps you can access yet.</h3>
                <p>Save a composition for your next group session.</p>
                <Link className="button secondary" href="/compositions">
                  Browse comps
                </Link>
              </div>
            )}
            <nav className="library-pagination" aria-label="Favorite composition pages">
              {compPage > 1 ? (
                <Link
                  className="button secondary"
                  href={href({ page: String(page), compPage: String(compPage - 1) })}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {compPage} / {compPages}
              </span>
              {compPage < compPages ? (
                <Link
                  className="button secondary"
                  href={href({ page: String(page), compPage: String(compPage + 1) })}
                >
                  Next page
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
