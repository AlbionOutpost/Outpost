import { AdSlot } from "@/components/ad-slot";
import { WorkspaceHeading } from "@/components/workspace-heading";
import Link from "@/components/link";
import { queryLibraryCompositions, findLibraryBuilds } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { CompRoster } from "@/components/comp-roster";
import { HeartChip } from "@/components/heart-chip";
import { MastheadTabs } from "@/components/masthead-tabs";
import { ArrowUpRight, Layers, Users, Swords } from "lucide-react";
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
    ...new Set(rows.flatMap((comp) => comp.members.slice(0, 5))),
  ]);
  const memberBuilds = new Map(builds.map((build) => [build.id, build]));
  const href = (n: number) =>
    `/compositions/library?${new URLSearchParams({ q, category, page: String(n) })}`;
  return (
    <div className="library-page group-build-library">
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title="Group Builds"
        description={`${total} group builds. Find complete loadouts for your party and make a plan together.`}
        actions={
          <Link href="/compositions/new" className="button primary">
            Create a comp
          </Link>
        }
      >
        <MastheadTabs
          label="Composition collections"
          tabs={[
            {
              href: "/compositions/library",
              label: "Group Builds",
              icon: <Layers size={16} />,
              current: true,
            },
            { href: "/compositions", label: "Player comps", icon: <Users size={16} /> },
            { href: "/builds/library", label: "Build library", icon: <Swords size={16} /> },
          ]}
        />
      </WorkspaceHeading>
      <form className="raised library-filter-bar" action="/compositions/library">
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
      <div className="section-heading library-section-heading">
        <h2>{matched} compositions</h2>
        <span>
          Page {page} / {pages}
        </span>
      </div>
      <div className="library-comp-grid">
        {rows.map((comp) => {
          const members = comp.members.flatMap((id) => {
            const b = memberBuilds.get(id);
            return b ? [b] : [];
          });
          const href = `/compositions/library/${encodeURIComponent(comp.slug)}`;
          return (
            <article
              className="raised has-scene library-comp-card"
              data-scene="composition"
              key={comp.slug}
            >
              <div className="library-card-bar">
                <Link href={href} className="ecosystem-title-link">
                  <h2>{comp.title}</h2>
                </Link>
                <span className="landing-chips">
                  <span className="landing-chip">{activityName(comp.category)}</span>
                  {comp.upvotes != null && <HeartChip count={comp.upvotes} />}
                </span>
              </div>
              {members.length ? (
                <CompRoster members={members} linked={false} />
              ) : (
                <p className="library-comp-empty">Member loadouts unavailable.</p>
              )}
              <Link href={href} className="library-card-caption" tabIndex={-1} aria-hidden="true">
                <span>
                  {comp.members.length} slots · by {comp.author}
                  {comp.members.length > 5 ? ` · +${comp.members.length - 5} more` : ""}
                </span>
                <span>
                  Open comp <ArrowUpRight size={13} aria-hidden="true" />
                </span>
              </Link>
            </article>
          );
        })}
      </div>
      {!rows.length && <p className="empty">No composition matches those filters.</p>}
      <AdSlot placement="hub" />
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
