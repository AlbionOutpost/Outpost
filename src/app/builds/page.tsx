import { ItemIcon } from "@/components/item-icon";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { BuildPreviewCard } from "@/components/build-preview-card";
import { contentTypes } from "@/lib/builds/validation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { featuredLibraryBuilds } from "@/lib/grind-library";
import { LibraryBuildCard } from "@/components/library-build-card";
export const dynamic = "force-dynamic";
export default async function Builds({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = value("q").trim().slice(0, 100);
  const page = z.coerce.number().int().min(1).max(10000).catch(1).parse(value("page"));
  const session = await getServerSession(authOptions);
  const mine = value("mine") === "1";
  const content = z
    .union([z.enum(contentTypes), z.literal("")])
    .catch("")
    .parse(value("content") || "");
  const weapon = z
    .enum(["MAIN_AXE", "MAIN_SWORD", "2H_BOW", ""])
    .catch("")
    .parse(value("weapon") || "");
  const sort = value("sort") === "saved" ? "saved" : "recent";
  const pagination = (n: number) =>
    `/builds?${new URLSearchParams({ q, mine: mine ? "1" : "0", content, weapon, sort, page: String(n) })}`;
  const weaponHref = (weapon: string) =>
    `/builds?${new URLSearchParams({ q, mine: mine ? "1" : "0", content, sort, weapon })}`;
  // Relation reads must share a snapshot if an author is deleted during discovery.
  const builds = await db.$transaction(
    (tx) =>
      tx.build.findMany({
        where: {
          hiddenAt: null,
          ...(content ? { contentType: content } : {}),
          ...(weapon
            ? { equipment: { some: { slot: "Main hand", itemId: { contains: `_${weapon}` } } } }
            : {}),
          ...(mine
            ? session?.user?.id
              ? { authorId: session.user.id }
              : { id: { in: [] as string[] } }
            : { visibility: "PUBLIC" }),
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy:
          sort === "saved"
            ? [{ favorites: { _count: "desc" } }, { updatedAt: "desc" }, { id: "asc" }]
            : [{ updatedAt: "desc" }, { id: "asc" }],
        take: 25,
        skip: (page - 1) * 24,
        include: {
          equipment: true,
          author: { select: { name: true } },
          favorites: {
            where: { userId: session?.user?.id || "" },
            select: { userId: true },
            take: 1,
          },
          _count: { select: { favorites: true } },
        },
      }),
    { isolationLevel: "RepeatableRead" },
  );
  return (
    <div className="build-discovery-page">
      <div className="section-heading">
        <h1 className="page-title display-title">Builds</h1>
        <Link className="button primary" href="/builds/new">
          Create a build
        </Link>
      </div>
      <p className="intro">Equipment plans and tactics from Albion players.</p>
      <nav className="discovery-tabs" aria-label="Build collections">
        <Link href="/builds" aria-current="page">
          Outpost builds
        </Link>
        <Link href="/builds/library">Grind library · 10,770</Link>
        <Link href="/compositions/library">Recovered comps</Link>
      </nav>
      {!mine && !q && !content && !weapon && page === 1 && (
        <section className="library-featured">
          <div className="library-section-heading">
            <div>
              <h2>Your Grind library, at home in Outpost.</h2>
              <p>Recovered loadouts, original authors, real equipment and recorded spells.</p>
            </div>
            <Link className="text-link" href="/builds/library">
              Browse all 10,770 builds →
            </Link>
          </div>
          <div className="library-build-grid">
            {featuredLibraryBuilds()
              .slice(0, 3)
              .map((b) => (
                <LibraryBuildCard key={b.id} build={b} />
              ))}
          </div>
        </section>
      )}

      <div className="build-discovery-workspace">
        <div className="build-discovery-toolbar">
          <nav className="weapon-shortcuts" aria-label="Weapon shortcuts">
            <Link href={weaponHref("")} aria-current={!weapon ? "true" : undefined}>
              All weapons
            </Link>
            {[
              ["MAIN_AXE", "Battleaxe", "T4_MAIN_AXE"],
              ["MAIN_SWORD", "Broadsword", "T4_MAIN_SWORD"],
              ["2H_BOW", "Bow", "T4_2H_BOW"],
            ].map(([code, name, item]) => (
              <Link
                key={code}
                href={weaponHref(code)}
                aria-current={weapon === code ? "true" : undefined}
              >
                <ItemIcon id={item} size={36} />
                <span>{name}</span>
              </Link>
            ))}
          </nav>
          <div className="build-discovery-querybar">
            <label>
              Search build titles
              <input
                form="build-discovery-query"
                name="q"
                type="search"
                maxLength={100}
                defaultValue={q}
                placeholder="Search loadouts…"
              />
            </label>
            <label>
              Sort builds
              <select
                form="build-discovery-query"
                aria-label="Sort builds"
                name="sort"
                defaultValue={sort}
              >
                <option value="recent">Newest first</option>
                <option value="saved">Most saved</option>
              </select>
            </label>
            <button form="build-discovery-query" className="button secondary" type="submit">
              Search builds
            </button>
          </div>
          <aside className="build-discovery-filters">
            <MobileFilterPanel>
              <form id="build-discovery-query" action="/builds" className="build-filter-form">
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
                  <select name="weapon" defaultValue={weapon} aria-label="Filter build weapon">
                    <option value="">All weapons</option>
                    <option value="MAIN_AXE">Battleaxe</option>
                    <option value="MAIN_SWORD">Broadsword</option>
                    <option value="2H_BOW">Bow</option>
                  </select>
                </label>
                <Link className="text-link" href="/builds">
                  Reset filters
                </Link>
                <Link className="text-link" href="/favorites">
                  Your favorites →
                </Link>
                <Link className="text-link" href="/guides">
                  Browse practical guides →
                </Link>
              </form>
            </MobileFilterPanel>
          </aside>
        </div>

        <section className="build-discovery-results" aria-label="Matching builds">
          <div className="build-results-heading">
            <h2>{mine ? "Your loadouts" : "Community loadouts"}</h2>
            <span>{builds.length > 24 ? "More than 24" : builds.length} on this page</span>
          </div>
          <div className="build-discovery-grid">
            {builds.slice(0, 24).map((b) => (
              <BuildPreviewCard
                key={b.id}
                build={b}
                authenticated={!!session?.user?.id}
                saved={b.favorites.length > 0}
                favoriteCount={b._count.favorites}
              />
            ))}
          </div>
          {!builds.length && (
            <section className="build-discovery-empty">
              <h2>No matching loadouts</h2>
              <p>
                {mine
                  ? "Your saved builds appear here. Adjust the filters or create your first private loadout."
                  : "Try another weapon or activity. Public builds appear when their authors publish them."}
              </p>
              <div className="button-row">
                <Link href="/builds" className="button secondary">
                  Clear filters
                </Link>
                <Link href="/builds/new" className="text-link">
                  Create a build →
                </Link>
              </div>
            </section>
          )}
          <div className="actions section">
            {page > 1 && (
              <Link className="button secondary" href={pagination(page - 1)}>
                Previous page
              </Link>
            )}
            {builds.length > 24 && (
              <Link className="button secondary" href={pagination(page + 1)}>
                Next page
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
