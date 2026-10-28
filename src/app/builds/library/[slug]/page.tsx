import Link from "@/components/link";
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
  const build = await findLibraryBuild((await params).slug);
  return { title: build?.title || "Build not found" };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const build = await findLibraryBuild(slug);
  if (!build) notFound();
  const names = await librarySpellNames();
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
            <div className="library-author-tags" aria-label="Build tags">
              {build.tags.map((tag, i) => (
                <span key={`${tag}-${i}`}>{tag}</span>
              ))}
            </div>
          )}
        </div>
        {(await libraryBuildDraft(build)) && <ArchiveBuildCopyLink slug={build.slug} />}
      </div>
      <p className="library-provenance">
        Check ability unlocks and current balance in game. Price checks start with Normal quality.
      </p>
      <BuildLoadoutView equipment={equipment} />
      <LibraryBuildTraits ids={build.recommendedTraits} traits={await libraryTraits()} />
      {build.description && (
        <section className="library-author-notes">
          <h2>From the author</h2>
          <p className="preserve">{build.description}</p>
        </section>
      )}
      <LibraryBuildVideos build={build} />
      <LoadoutPriceCheck equipment={equipment} />
      <div className="library-detail-footer">
        <span>Author update: {build.updatedAt.slice(0, 10) || "Unknown"}</span>
      </div>
    </div>
  );
}
