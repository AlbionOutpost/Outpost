import Link from "@/components/link";
import { queryLibraryCompositions, findLibraryBuilds } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { ItemIcon } from "@/components/item-icon";
export const metadata = { title: "Group Builds" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category.slice(0, 100) : "";
  const { rows, total, matched, categories, pages, page } = await queryLibraryCompositions({
    q,
    category,
    page: Number.parseInt(params.page || "1") || 1,
  });
  const builds = await findLibraryBuilds([
    ...new Set(rows.flatMap((comp) => comp.members.slice(0, 3))),
  ]);
  const memberBuilds = new Map(builds.map((build) => [build.id, build]));
  const href = (n: number) =>
    `/compositions/library?${new URLSearchParams({ q, category, page: String(n) })}`;
  return (
    <div className="library-page group-build-library">
      <div className="section-heading">
        <div>
          <h1 className="page-title display-title">Group Builds</h1>
          <p className="intro">
            {total} group builds. Find complete loadouts for your party and make a plan together.
          </p>
        </div>
        <Link href="/compositions/new" className="button primary">
          Create a comp
        </Link>
      </div>
      <nav className="discovery-tabs" aria-label="Composition collections">
        <Link href="/compositions/library" aria-current="page">
          Group Builds
        </Link>
        <Link href="/compositions">Player comps</Link>
        <Link href="/builds/library">Build library</Link>
      </nav>
      <p className="library-provenance">
        Explore complete party plans, equipment swaps and optional roles. Adapt a composition to
        your group and activity.
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
        <h2>{matched} compositions</h2>
        <span>
          Page {page} / {pages}
        </span>
      </div>
      <div className="library-comp-grid">
        {rows.map((comp) => (
          <article className="library-comp-card group-build-preview" key={comp.slug}>
            <Link href={`/compositions/library/${encodeURIComponent(comp.slug)}`}>
              <span>
                {activityName(comp.category)} · {comp.members.length} slots
              </span>
              <h2>{comp.title}</h2>
              <div className="group-build-loadout-previews">
                {comp.members.slice(0, 3).map((id, i) => {
                  const build = memberBuilds.get(id);
                  return (
                    <div
                      className="group-build-member-preview"
                      key={i}
                      title={build?.title || "Loadout unavailable"}
                    >
                      <span>{i + 1}</span>
                      {build ? (
                        ["Main hand", "Helmet", "Chest", "Boots", "Cape", "Food", "Potion"].flatMap(
                          (slot) => {
                            const item = build.equipment.find((row) => row.slot === slot);
                            return item ? [<ItemIcon key={slot} id={item.itemId} size={32} />] : [];
                          },
                        )
                      ) : (
                        <span>?</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {comp.members.length > 3 && (
                <small>+ {comp.members.length - 3} more member loadouts</small>
              )}
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
