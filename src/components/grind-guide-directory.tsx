import Link, { BuildRegionInput } from "@/components/build-region-link";
import { brandCopy } from "@/lib/brand-copy";
import Image from "next/image";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ItemIcon } from "./item-icon";
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
      <form action="/guides" className="library-filter-bar">
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
      <div className="library-section-heading">
        <h2>The Outpost field guide</h2>
        <span>{matches.length} guides to explore</span>
      </div>
      <div className="grind-guide-grid guide-editorial-list">
        {matches.map((guide) => (
          <article key={guide.slug} className="grind-guide-card">
            <Link href={`/guides/${guide.slug}`}>
              <div className="guide-story-art">
                {guide.cover ? (
                  <Image
                    unoptimized
                    src={guide.cover.src}
                    width={guide.cover.width}
                    height={guide.cover.height}
                    alt=""
                  />
                ) : (
                  <ItemIcon id={guideArtwork[guide.slug] || "T4_BAG"} size={72} />
                )}
              </div>
              <div className="grind-guide-copy">
                <small className="guide-story-category">{guide.category}</small>
                <h2>{guide.title}</h2>
                <p>{brandCopy(guide.summary)}</p>
                <div>
                  <span>
                    <BookOpen size={13} /> By {guide.author}
                  </span>
                  <span>{guide.updatedAt ? `Updated ${guide.updatedAt}` : "Date unavailable"}</span>
                </div>
              </div>
              <ArrowUpRight className="guide-story-arrow" size={18} />
            </Link>
          </article>
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
