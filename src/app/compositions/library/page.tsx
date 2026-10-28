import Link from "next/link";
import { libraryCompositions, findLibraryBuild } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { ItemIcon } from "@/components/item-icon";
export const metadata = { title: "Grind group composition library" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category.slice(0, 100) : "";
  const all = libraryCompositions();
  const categories = [...new Set(all.map((c) => c.category))].filter(Boolean).sort();
  const rows = all.filter(
    (c) =>
      (!category || c.category === category) &&
      `${c.title} ${c.author}`.toLowerCase().includes(q.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 18));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const href = (n: number) =>
    `/compositions/library?${new URLSearchParams({ q, category, page: String(n) })}`;
  return (
    <div className="library-page">
      <div className="section-heading">
        <div>
          <h1 className="page-title display-title">A plan for every party.</h1>
          <p className="intro">
            {all.length} group compositions recovered from your Grind library.
          </p>
        </div>
        <Link href="/compositions/new" className="button primary">
          Create a comp
        </Link>
      </div>
      <nav className="discovery-tabs" aria-label="Composition collections">
        <Link href="/compositions/library" aria-current="page">
          Grind compositions
        </Link>
        <Link href="/compositions">Outpost comps</Link>
        <Link href="/builds/library">Build library</Link>
      </nav>
      <p className="library-provenance">
        Public archive · 27 October 2026. Original member order, repeated roles and optional slots
        are preserved. These are historical party plans.
      </p>
      <form className="library-filter-bar" action="/compositions/library">
        <label>
          Search compositions
          <input
            type="search"
            name="q"
            maxLength={100}
            defaultValue={q}
            placeholder="Party name or author"
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
        <button className="button secondary">Find compositions</button>
      </form>
      <div className="library-section-heading">
        <h2>{rows.length} compositions</h2>
        <span>
          Page {page} / {pages}
        </span>
      </div>
      <div className="library-comp-grid">
        {rows.slice((page - 1) * 18, page * 18).map((comp) => (
          <article className="library-comp-card" key={comp.slug}>
            <Link href={`/compositions/library/${encodeURIComponent(comp.slug)}`}>
              <span>
                {activityName(comp.category)} · {comp.members.length} slots
              </span>
              <h2>{comp.title}</h2>
              <div className="library-comp-weapons">
                {comp.members.slice(0, 12).map((id, i) => {
                  const build = findLibraryBuild(id);
                  const main = build?.equipment.find((e) => e.slot === "Main hand");
                  return (
                    <span key={i} title={build?.title || "Unresolved loadout"}>
                      {main ? <ItemIcon id={main.itemId} size={44} /> : <span>?</span>}
                    </span>
                  );
                })}
              </div>
              <small>By {comp.author}</small>
            </Link>
          </article>
        ))}
      </div>
      {!rows.length && <p className="empty">No composition matches those filters.</p>}
      <nav className="library-pagination" aria-label="Composition library pages">
        {page > 1 ? (
          <Link className="button secondary" href={href(page - 1)}>
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} / {pages}
        </span>
        {page < pages ? (
          <Link className="button secondary" href={href(page + 1)}>
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
