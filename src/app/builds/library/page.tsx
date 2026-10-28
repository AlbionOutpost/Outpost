import Link from "next/link";
import { libraryBuilds, featuredLibraryBuilds } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { LibraryBuildCard } from "@/components/library-build-card";
export const metadata = { title: "Grind build library" };
export default async function Library({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? params[key].slice(0, 100) : "");
  const q = str("q").trim(),
    category = str("category"),
    sort = str("sort");
  const rows = libraryBuilds();
  const categories = [...new Set(rows.map((b) => b.category))].filter(Boolean).sort();
  const matches = rows.filter(
    (b) =>
      (!category || b.category === category) &&
      `${b.title} ${b.weaponName} ${b.author} ${b.tags.join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  if (sort === "title") matches.sort((a, b) => a.title.localeCompare(b.title));
  const pages = Math.max(1, Math.ceil(matches.length / 24));
  const page = Math.min(pages, Math.max(1, Number.parseInt(str("page")) || 1));
  const pageHref = (n: number) =>
    `/builds/library?${new URLSearchParams({ q, category, sort, page: String(n) })}`;
  return (
    <div className="library-page">
      <div className="section-heading">
        <div>
          <h1 className="page-title display-title">Find your next loadout.</h1>
          <p className="intro">
            {rows.length.toLocaleString("en-GB")} builds from your Albion Online Grind library.
            Every weapon, every kind of adventure.
          </p>
        </div>
        <Link className="button primary" href="/builds/new">
          Create a build
        </Link>
      </div>
      <nav className="discovery-tabs" aria-label="Build collections">
        <Link href="/builds/library" aria-current="page">
          Grind library
        </Link>
        <Link href="/builds">Outpost builds</Link>
        <Link href="/compositions/library">Group compositions</Link>
        <Link href="/guides">Guides</Link>
      </nav>
      <p className="library-provenance">
        Recovered from the public archive captured 27 October 2026. Authors and recorded selections
        are preserved; current-meta status is unverified.
      </p>
      {!q && !category && page === 1 && !sort && (
        <section className="library-featured">
          <div className="library-section-heading">
            <h2>A place to start</h2>
            <span>Selected from the recovered library</span>
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
      <form className="library-filter-bar" action="/builds/library">
        <label>
          Search builds
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Weapon, build title or author"
            maxLength={100}
          />
        </label>
        <label>
          Activity
          <select name="category" defaultValue={category}>
            <option value="">All activities</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {activityName(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={sort}>
            <option value="">Archive order</option>
            <option value="title">Build title</option>
          </select>
        </label>
        <button className="button secondary">Find builds</button>
      </form>
      <div className="library-section-heading">
        <h2>{q || category ? "Matching loadouts" : "The full library"}</h2>
        <span>
          {matches.length.toLocaleString("en-GB")} builds · page {page} of {pages}
        </span>
      </div>
      <div className="library-build-grid">
        {matches.slice((page - 1) * 24, page * 24).map((b) => (
          <LibraryBuildCard key={b.id} build={b} />
        ))}
      </div>
      {!matches.length && (
        <div className="panel empty">
          <h2>No loadouts match that search</h2>
          <p>Try a different weapon, author or activity.</p>
          <Link href="/builds/library" className="text-link">
            Clear filters
          </Link>
        </div>
      )}
      <nav className="library-pagination" aria-label="Library pages">
        {page > 1 ? (
          <Link className="button secondary" href={pageHref(page - 1)}>
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} / {pages}
        </span>
        {page < pages ? (
          <Link className="button secondary" href={pageHref(page + 1)}>
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
