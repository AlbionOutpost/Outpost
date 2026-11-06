import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { Search } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { WorkspaceHeading } from "@/components/workspace-heading";
import Link from "@/components/build-region-link";
import { queryLibraryCompositions, findLibraryBuilds } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { CompRoster } from "@/components/comp-roster";
import { HeartChip } from "@/components/heart-chip";
import { CompTabs } from "@/components/comp-tabs";
import { CompPages, CompWindow } from "@/components/comp-window";
import { CompNextSteps } from "@/components/comp-next-steps";
import { SectionHeading } from "@/components/section-heading";
import { EmptyWell } from "@/components/empty-well";
import { WellSelect } from "@/components/well-select";
import styles from "@/components/comps.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/compositions/library", await searchParams);
}
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
  const filtered = !!(q || category);
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title="Group Builds"
        accent="Builds"
        description={`${total.toLocaleString()} comps recorded by players, each with every member’s loadout. Copy one to plan your own party around it.`}
        actions={
          <Link href="/compositions/new" className="button primary">
            Create a comp
          </Link>
        }
      >
        <CompTabs current="library" />
      </WorkspaceHeading>
      <form
        className={`raised ${styles.filters} ${styles.hasSelect}`}
        action="/compositions/library"
        role="search"
        aria-label="Find Group Builds"
      >
        <label>
          Search comps
          <span className={styles.searchWell}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              name="q"
              maxLength={100}
              defaultValue={q}
              placeholder="Comp name or author"
            />
          </span>
        </label>
        <label>
          Activity
          <WellSelect name="category" defaultValue={category}>
            <option value="">All activities</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {activityName(c)}
              </option>
            ))}
          </WellSelect>
        </label>
        <button className="button secondary">Find comps</button>
      </form>
      <section className={styles.section} aria-labelledby="library-comps">
        <SectionHeading
          id="library-comps"
          title={
            <>
              {matched.toLocaleString()} <em>{matched === 1 ? "comp" : "comps"}</em>
            </>
          }
          line={
            filtered
              ? `Matching ${[q && `“${q}”`, category && activityName(category)].filter(Boolean).join(" in ")}, most liked first.`
              : "Most liked first. Each window shows the first five members by weapon type."
          }
        />
        {rows.length ? (
          <ul className={styles.grid}>
            {rows.map((comp) => {
              const members = comp.members.flatMap((id) => {
                const b = memberBuilds.get(id);
                return b ? [b] : [];
              });
              const more = comp.members.length - 5;
              return (
                <li key={comp.slug}>
                  <CompWindow
                    title={comp.title}
                    href={`/compositions/library/${encodeURIComponent(comp.slug)}`}
                    chips={
                      <>
                        <span className="landing-chip">{activityName(comp.category)}</span>
                        {comp.upvotes != null && <HeartChip count={comp.upvotes} />}
                      </>
                    }
                    caption={`${comp.members.length} members · by ${comp.author}${more > 0 ? ` · +${more} more` : ""}`}
                  >
                    {members.length ? (
                      <CompRoster members={members} linked={false} />
                    ) : (
                      <p className={styles.memberNote}>Member loadouts unavailable.</p>
                    )}
                  </CompWindow>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyWell
            emblem="team-comps"
            title="No comp matches those filters"
            line="Try another name, or look across every activity."
            action={
              <Link className="button secondary" href="/compositions/library">
                Clear filters
              </Link>
            }
          />
        )}
        <CompPages
          page={page}
          pages={pages}
          next={page < pages}
          href={href}
          label="Group Build pages"
        />
      </section>
      <AdSlot placement="hub" />
      <CompNextSteps
        show={["create", "player", "builds"]}
        title={
          <>
            Plan your <em>own</em>
          </>
        }
        line="Start from a blank party, or see what other players have shared."
      />
    </div>
  );
}
