import Link, { BuildRegionInput } from "@/components/build-region-link";
import { brandCopy } from "@/lib/brand-copy";
import { GuideCoverCard, readingMinutes } from "./guide-cover-card";
import type { LibraryGuide } from "@/lib/grind-library-types";

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
export function GrindGuideDirectory({
  guides,
  query,
  category,
}: {
  guides: LibraryGuide[];
  query: string;
  category: string;
}) {
  const categories = [...new Set(guides.map((g) => g.category))].sort();
  const matches = guides.filter(
    (g) =>
      (!category || g.category === category) &&
      `${g.title} ${g.summary} ${g.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="grind-guide-library support-guide-library">
      <form action="/guides" className="raised library-filter-bar">
        <BuildRegionInput />
        <label>
          Search the library
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder="Fishing, gathering, market flipping…"
          />
        </label>
        <label>
          Topic
          <select name="category" defaultValue={category}>
            <option value="">Every topic</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="button secondary">Find guides</button>
      </form>
      <div className="section-heading library-section-heading">
        <h2>
          The Outpost <em>field guide</em>
        </h2>
        <p>{matches.length} guides to explore</p>
      </div>
      <div className="grind-guide-grid guide-editorial-list">
        {matches.map((guide) => (
          <GuideCoverCard
            key={guide.slug}
            className="grind-guide-card"
            guide={{
              slug: guide.slug,
              title: guide.title,
              category: guide.category,
              author: guide.author,
              updatedAt: guide.updatedAt,
              summary: brandCopy(guide.summary),
              minutes: readingMinutes(guide.content),
              cover: guide.cover,
              itemId: guideArtwork[guide.slug],
            }}
          />
        ))}
      </div>
      {!matches.length && (
        <p className="panel empty">
          No guide matches that search.{" "}
          <Link className="text-link" href="/guides">
            Show every guide
          </Link>
        </p>
      )}
    </section>
  );
}
