import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findLibraryBuild,
  libraryBuildDraft,
  librarySpellNames,
  libraryTraits,
} from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { BuildLoadoutView } from "@/components/build-loadout-view";
import { LoadoutPriceCheck } from "@/components/loadout-price-check";
import { LibraryBuildTraits, LibraryBuildVideos } from "@/components/library-build-metadata";
import { ArchiveBuildCopyLink } from "@/components/archive-build-links";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const build = findLibraryBuild((await params).slug);
  return { title: build?.title || "Build not found" };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const build = findLibraryBuild(slug);
  if (!build) notFound();
  const names = librarySpellNames();
  const equipment = build.equipment.map((row) => ({
    slot: row.slot,
    itemId: row.itemId,
    quality: 1,
    abilities: "",
    alternatives: "",
    abilitySelections: {},
    alternativeItemIds: row.alternatives,
    recordedSkills: row.skills.map((id) => ({ id, name: names[id] || id })),
    alternativeRecordedSkills: Object.fromEntries(
      Object.entries(row.alternativeSkills).map(([id, skills]) => [
        id,
        skills.map((spell) => ({ id: spell, name: names[spell] || spell })),
      ]),
    ),
  }));
  return (
    <div className="build-detail-page library-build-detail">
      <Link href="/builds/library" className="library-back-link">
        ← Build library
      </Link>
      <div className="section-heading">
        <div>
          <h1 className="page-title display-title">{build.title}</h1>
          <p className="intro">
            {activityName(build.category)} · By {build.author}
          </p>
          {!!build.tags.length && (
            <div className="library-author-tags" aria-label="Archived author tags">
              {build.tags.map((tag, i) => (
                <span key={`${tag}-${i}`}>{tag}</span>
              ))}
            </div>
          )}
        </div>
        {libraryBuildDraft(build) && <ArchiveBuildCopyLink slug={build.slug} />}
      </div>
      <div className="library-provenance">
        Grind archive · captured 27 October 2026. Recorded spells and alternatives are historical.
        Confirm unlocks and current balance in game. Quality was not captured; price checks use
        Normal.
      </div>
      <BuildLoadoutView equipment={equipment} />
      <LibraryBuildTraits ids={build.recommendedTraits} traits={libraryTraits()} />
      {build.description && (
        <section className="library-author-notes">
          <h2>From the author</h2>
          <p className="preserve">{build.description}</p>
        </section>
      )}
      <LibraryBuildVideos build={build} />
      <LoadoutPriceCheck equipment={equipment} />
      <div className="library-detail-footer">
        <Link
          href={`https://albiononlinegrind.com/build/${encodeURIComponent(build.sourceSlug)}`}
          className="text-link"
        >
          Original build page ↗
        </Link>
        <span>
          Author update: {build.updatedAt.slice(0, 10) || "Unknown"} · Archive is separate from your
          Outpost saves.
        </span>
      </div>
    </div>
  );
}
