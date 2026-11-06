import { ArrowRight, Search } from "lucide-react";
import Link, { BuildRegionInput } from "@/components/build-region-link";
import { brandCopy } from "@/lib/brand-copy";
import { GuideCoverCard, readingMinutes, type GuideCover } from "./guide-cover-card";
import { SectionHeading } from "./section-heading";
import { EmptyWell } from "./empty-well";
import type { LibraryGuide } from "@/lib/grind-library-types";
import styles from "@/app/guides/guides.module.css";

export const guideArtwork: Record<string, string> = {
  "market-flipping-guide": "T4_BAG",
  "fishing-leveling-guide": "T7_FISH_FRESHWATER_ALL_COMMON",
  "black-zone-gathering-guide": "T8_2H_TOOL_PICK",
  "corrupted-dungeon-ratting": "T8_MAIN_CURSEDSTAFF",
  "dragonfire-items": "T8_MAIN_FIRESTAFF",
  "ancient-lands": "T8_2H_SHAPESHIFTER_MORGANA",
  "albion-journal-guide": "T4_JOURNAL_WARRIOR_EMPTY",
  achievements: "T8_CAPE",
  "first-silver": "T3_2H_TOOL_PICK",
  "focus-and-resource-return-rate": "T4_PLANKS",
  "haul-between-cities": "T5_MOUNT_OX",
  "first-solo-pve-build": "T4_MAIN_SWORD",
  "read-a-market-quote": "T4_BAG",
  "count-the-whole-cost": "T4_METALBAR",
  "build-with-a-purpose": "T4_ARMOR_LEATHER_SET1",
  "put-every-role-in-place": "T4_2H_HAMMER",
};

const cover = (guide: LibraryGuide): GuideCover => ({
  slug: guide.slug,
  title: guide.title,
  category: guide.category,
  author: guide.author,
  updatedAt: guide.updatedAt,
  summary: brandCopy(guide.summary),
  minutes: readingMinutes(guide.content),
  cover: guide.cover,
  itemId: guideArtwork[guide.slug],
});

/**
 * The guides hub: one search with topic pills over every guide as a cover card, newest first,
 * four across on wide screens so the 16 guides fill their rows.
 */
export function GrindGuideDirectory({
  guides,
  query,
  category,
}: {
  guides: LibraryGuide[];
  query: string;
  category: string;
}) {
  const needle = query.toLowerCase();
  const topics = [...new Set(guides.map((g) => g.category))].sort();
  const filtered = Boolean(query || category);
  const matches = guides.filter(
    (g) =>
      (!category || g.category === category) &&
      `${g.title} ${g.summary} ${g.category}`.toLowerCase().includes(needle),
  );
  // One grid, newest first; the topic pills and the search narrow it
  const listed = matches.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const topicHref = (topic: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (topic) params.set("category", topic);
    const search = params.toString();
    return `/guides${search ? `?${search}` : ""}`;
  };
  const count = matches.length;
  return (
    <>
      <section className={`grind-guide-library ${styles.section}`} aria-labelledby="guides-library">
        <SectionHeading
          id="guides-library"
          title={
            filtered ? (
              <>
                Matching <em>guides</em>
              </>
            ) : (
              <>
                Every <em>guide</em>
              </>
            )
          }
          line={
            filtered
              ? `${count} ${count === 1 ? "result" : "results"}${query ? ` for “${query}”` : ""}${category ? ` in ${category}` : ""}.`
              : `${guides.length} guides on progression, gathering, PvE, trading and crafting.`
          }
        />
        <form action="/guides" className={`raised ${styles.filters}`} role="search">
          <BuildRegionInput />
          {category && <input type="hidden" name="category" value={category} />}
          <nav className={styles.topics} aria-label="Guide topics">
            {["", ...topics].map((topic) => (
              <Link
                key={topic}
                href={topicHref(topic)}
                aria-current={category === topic ? "page" : undefined}
              >
                {topic || "Every topic"}
              </Link>
            ))}
          </nav>
          <div className={styles.searchRow}>
            <label className={styles.search}>
              <span className="sr-only">Search guides</span>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                maxLength={100}
                placeholder="Fishing, gathering, market flipping…"
              />
            </label>
            <button className="button secondary">Search</button>
          </div>
        </form>
        {listed.length > 0 && (
          <div className={`grind-guide-grid ${styles.grid}`}>
            {listed.map((guide) => (
              <GuideCoverCard key={guide.slug} className="grind-guide-card" guide={cover(guide)} />
            ))}
          </div>
        )}
        {filtered && !count && (
          <EmptyWell
            emblem="tool-planner"
            title="No guide matches that search."
            line="Try a shorter word or another topic."
            action={
              <Link className="pill-link" href="/guides">
                Show every guide <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
