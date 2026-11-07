import { ArrowRight } from "lucide-react";
import Link, { BuildRegionInput } from "@/components/build-region-link";
import { brandCopy } from "@/lib/brand-copy";
import { GuideCoverCard, readingMinutes, type GuideCover } from "./guide-cover-card";
import { SectionHeading } from "./section-heading";
import { EmptyWell } from "./empty-well";
import type { LibraryGuide } from "@/lib/grind-library-types";
import styles from "@/app/guides/guides.module.css";
import { SearchInput } from "./field";

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
  "hellgates-guide": "T4_2H_CLAYMORE",
  "abyssal-depths-guide": "T4_2H_AXE",
  "mists-guide": "T4_CAPEITEM_FW_BRECILIEN",
  "roads-of-avalon-guide": "T4_SHOES_LEATHER_AVALON",
  "faction-warfare-guide": "T4_CAPEITEM_FW_LYMHURST",
  "zones-and-death-loss": "T8_POTION_CLEANSE",
  "tracking-guide": "T4_2H_TOOL_TRACKING",
  "crystal-arena-guide": "T4_MAIN_1HCROSSBOW",
  "group-dungeons-guide": "T4_MAIN_HOLYSTAFF",
  "islands-and-farming-guide": "T4_2H_TOOL_SICKLE",
  "gathering-progression-guide": "T4_HEAD_GATHERER_FIBER",
  "destiny-board-guide": "T4_OFF_BOOK",
  "enchanting-guide": "T4_MAIN_SWORD@1",
  "zvz-guide": "T8_2H_HAMMER",
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
 * three across on wide screens so the 30 guides fill their rows.
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
      <section
        className={`grind-guide-library ${styles.section}`}
        {...(filtered ? { "aria-labelledby": "guides-library" } : { "aria-label": "Every guide" })}
      >
        {/* Unfiltered, the masthead already names the list; a search gets its own heading */}
        {filtered && (
          <SectionHeading
            id="guides-library"
            title={
              <>
                Matching <em>guides</em>
              </>
            }
            line={`${count} ${count === 1 ? "result" : "results"}${query ? ` for “${query}”` : ""}${category ? ` in ${category}` : ""}.`}
          />
        )}
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
              <SearchInput
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
            {listed.map((guide, index) => (
              <GuideCoverCard
                key={guide.slug}
                className="grind-guide-card"
                guide={cover(guide)}
                priority={index === 0}
              />
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
