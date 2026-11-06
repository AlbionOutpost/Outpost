import type { ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";
import Link, { BuildRegionInput } from "@/components/build-region-link";
import { brandCopy } from "@/lib/brand-copy";
import { GuideCoverCard, readingMinutes, type GuideCover } from "./guide-cover-card";
import { GuidesCarousel } from "./landing/guides-carousel";
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
};

/** Short notes on how Outpost's own tools work; the hub's search and topics cover them too. */
export type ToolNote = {
  id: string;
  title: string;
  body: ReactNode;
  /** Plain text the search matches, since `body` may hold links. */
  text: string;
  link: { href: string; label: string };
};
export const notesTopic = "Using Outpost";

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
 * The guides hub: the three newest guides as the landing's lead story and two side stories,
 * one search with topic pills, every other guide as a cover card three across, and the notes on
 * Outpost's tools as a topic of their own.
 */
export function GrindGuideDirectory({
  guides,
  notes,
  query,
  category,
}: {
  guides: LibraryGuide[];
  notes: ToolNote[];
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
  const noteMatches = notes.filter(
    (n) =>
      (!category || category === notesTopic) &&
      `${n.title} ${n.text}`.toLowerCase().includes(needle),
  );
  const newest = guides.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const listed = filtered ? matches : guides.filter((g) => !newest.includes(g));
  const topicHref = (topic: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (topic) params.set("category", topic);
    const search = params.toString();
    return `/guides${search ? `?${search}` : ""}`;
  };
  const count = matches.length + noteMatches.length;
  return (
    <>
      {!filtered && newest.length > 0 && (
        <section className={styles.section} aria-labelledby="guides-newest">
          <SectionHeading
            id="guides-newest"
            title={
              <>
                New from <em>players</em>
              </>
            }
            line="The three most recently updated guides."
          />
          <div className={styles.carousel}>
            <GuidesCarousel guides={newest.map(cover)} suffix="" />
          </div>
        </section>
      )}
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
              : `${guides.length} guides on progression, gathering, PvE and making silver.`
          }
        />
        <form action="/guides" className={`raised ${styles.filters}`} role="search">
          <BuildRegionInput />
          {category && <input type="hidden" name="category" value={category} />}
          <nav className={styles.topics} aria-label="Guide topics">
            {["", ...topics, notesTopic].map((topic) => (
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
        {noteMatches.length > 0 && (filtered || category === notesTopic) && (
          <ToolNotes notes={noteMatches} />
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
      {!filtered && (
        <section className={styles.section} aria-labelledby="guides-tool-notes">
          <SectionHeading
            id="guides-tool-notes"
            title={
              <>
                Using <em>Outpost</em>
              </>
            }
            line="Short notes on reading prices, costing a craft, sharing builds and planning comps."
          />
          <ToolNotes notes={notes} />
        </section>
      )}
    </>
  );
}

const noteScenes = ["market", "economy", "build", "composition"];

function ToolNotes({ notes }: { notes: ToolNote[] }) {
  return (
    <ul className={styles.noteList} aria-label={notesTopic}>
      {notes.map((note, i) => (
        <li
          key={note.id}
          id={note.id}
          className={`raised has-scene guide-note ${styles.note}`}
          data-scene={noteScenes[i % noteScenes.length]}
        >
          <h3>{note.title}</h3>
          <div className={styles.noteBody}>{note.body}</div>
          <Link className="pill-link is-small" href={note.link.href}>
            {note.link.label} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
