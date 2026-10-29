import { BuildRegionInput } from "@/components/build-region-link";
import { ItemIcon } from "@/components/item-icon";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { BuildPreviewCard } from "@/components/build-preview-card";
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
import { LayoutGrid, List } from "lucide-react";
export const dynamic = "force-dynamic";
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
  return (
    <div
      className={`builds-ecosystem build-discovery-page ${mine ? "personal-build-collection" : "community-build-collection"} view-${view}`}
    >
      <BuildDiscoveryHeader
        active={mine ? "mine" : "browse"}
        source="community"
        title={mine ? "My Builds" : "Albion Online Builds"}
        description={
          mine
            ? "Your loadouts, revisions and equipment plans. Private builds stay visible only to you."
            : "Builds shared by Outpost players. Find a loadout or publish your own."
        }
      />
      <div className="ecosystem-discovery-layout">
        <aside className="ecosystem-filter-rail">
          <MobileFilterPanel>
            <form
              id="build-discovery-query"
              action="/builds"
              className="ecosystem-filter-form build-filter-form"
            >
              <BuildRegionInput />
              <input type="hidden" name="view" value={view} />
              <BuildDiscoverySearch
                value={q}
                formId="build-discovery-query"
                label="Search build titles"
                placeholder="Search loadouts…"
              />
              <label>
                Collection
                <select name="mine" defaultValue={mine ? "1" : "0"} aria-label="Build collection">
                  <option value="0">Public builds</option>
                  <option value="1">My builds</option>
                </select>
              </label>
              <label>
                Content type
                <select name="content" defaultValue={content} aria-label="Filter build content">
                  <option value="">All activities</option>
                  {contentTypes.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Weapon family
                <select name="family" defaultValue={family} aria-label="Build weapon family">
                  <option value="">All families</option>
                  {buildDiscovery.families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Specific weapon
                <select name="weapon" defaultValue={weapon} aria-label="Filter build weapon">
                  <option value="">All weapons</option>
                  {choices
                    .filter((w) => !family || w.family === family)
                    .map((w) => (
                      <option value={w.code} key={w.code}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="button primary" type="submit">
                Search builds
              </button>
              <Link className="text-link" href={mine ? "/builds?mine=1" : "/builds"}>
                Reset filters
              </Link>
            </form>
          </MobileFilterPanel>
        </aside>
        <section className="build-discovery-results ecosystem-results" aria-label="Matching builds">
          <div className="ecosystem-result-toolbar">
            <label className="ecosystem-sort-label">
              Sort
              <select
                form="build-discovery-query"
                name="sort"
                aria-label="Sort builds"
                defaultValue={sort}
              >
                <option value="recent">Recently updated</option>
                <option value="saved">Most saved</option>
              </select>
            </label>
            <button form="build-discovery-query" className="button secondary ecosystem-apply-sort">
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
              <strong>{total.toLocaleString("en-GB")}</strong>{" "}
              {mine ? "your matching loadouts" : "matching community builds"} ·{" "}
              {builds.length ? `${(page - 1) * 24 + 1}–${Math.min(page * 24, total)}` : "0"} shown
            </p>
            <SaveBuildFilter path="/builds" query={query} />
          </div>
          <nav
            className="weapon-shortcuts ecosystem-weapon-shortcuts"
            aria-label="Weapon shortcuts"
          >
            <Link
              href={href({ weapon: "", family: "", page: "1" })}
              aria-current={!weapon ? "true" : undefined}
            >
              All weapons
            </Link>
            {[
              ["MAIN_AXE", "Battleaxe", "T4_MAIN_AXE"],
              ["MAIN_SWORD", "Broadsword", "T4_MAIN_SWORD"],
              ["2H_BOW", "Bow", "T4_2H_BOW"],
            ].map(([code, name, item]) => (
              <Link
                key={code}
                href={href({ weapon: code, family: "", page: "1" })}
                aria-current={weapon === code ? "true" : undefined}
              >
                <ItemIcon id={item} size={25} />
                {name}
              </Link>
            ))}
          </nav>
          <div className="build-results-heading">
            <h2>{mine ? "Your loadouts" : "Community loadouts"}</h2>
            <span>{builds.length} on this page</span>
          </div>
          <div className="build-discovery-grid account-build-grid">
            {builds.map((b) => (
              <BuildPreviewCard
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
            <section className="build-discovery-empty ecosystem-empty">
              <h2>No matching loadouts</h2>
              <p>
                {mine
                  ? !session?.user?.id
                    ? "Sign in to see your account builds. Device favorites are available without signing in."
                    : "Your saved builds appear here. Adjust the filters or create your first private loadout."
                  : "Try another weapon or activity. Public builds appear when their authors publish them."}
              </p>
              <div className="button-row">
                <Link href={mine ? "/builds?mine=1" : "/builds"} className="button secondary">
                  Clear filters
                </Link>
                <Link
                  href={mine && !session?.user?.id ? "/signin" : "/builds/new"}
                  className="text-link"
                >
                  {mine && !session?.user?.id ? "Sign in with Discord" : "Create a build →"}
                </Link>
              </div>
            </section>
          )}
          <nav className="library-pagination" aria-label="Community build pages">
            {page > 1 ? (
              <Link className="button secondary" href={href({ page: String(page - 1) })}>
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} / {pages}
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
    </div>
  );
}
