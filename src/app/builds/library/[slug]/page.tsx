import { AdSlot } from "@/components/ad-slot";
import Link from "@/components/build-region-link";
import { notFound } from "next/navigation";
import {
  findLibraryBuild,
  libraryBuildDraft,
  librarySpellNames,
  libraryTraits,
  queryLibraryBuilds,
} from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { BuildLoadoutView } from "@/components/build-loadout-view";
import { LoadoutPriceCheck } from "@/components/loadout-price-check";
import { LibraryBuildTraits, LibraryBuildVideos } from "@/components/library-build-metadata";
import { ArchiveBuildCopyLink } from "@/components/archive-build-links";
import { LibrarySaveButton } from "@/components/library-save-button";
import { BuildCompositionLink } from "@/components/build-composition-link";
import { BuildDetailHeader, BuildDetailNavigation } from "@/components/build-detail-header";
import { LibraryBuildCard } from "@/components/library-build-card";
import { BuildShareControls } from "@/components/build-share-controls";
import { brandCopy } from "@/lib/brand-copy";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const build = await findLibraryBuild((await params).slug);
  return { title: build?.title || "Build not found" };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    build = await findLibraryBuild(slug);
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
  const main = equipment.find((row) => row.slot === "Main hand");
  const savedBuild = {
    id: build.id,
    slug: build.slug.length <= 200 ? build.slug : build.id,
    title: build.title,
    author: build.author,
    weaponName: build.weaponName,
    category: build.category,
    itemId: main?.itemId || "",
    updatedAt: build.updatedAt,
  };
  const copyAvailable = await libraryBuildDraft(build);
  // Related picks skip the current build and obvious scratch copies ("(Copy)", "test", "zzz").
  const scratch = /\bcopy\b|\(copy\)|\btest\b|zzz|asdf/i;
  const related = build.weaponName
    ? (await queryLibraryBuilds({ weapon: build.weaponName, page: 1 })).rows
        .filter(
          (candidate) =>
            candidate.id !== build.id &&
            !scratch.test(candidate.title) &&
            !scratch.test(candidate.author),
        )
        .slice(0, 3)
    : [];
  return (
    <div className="build-detail-page library-build-detail build-detail-redesign">
      <BuildDetailHeader
        title={build.title}
        description={brandCopy(build.description)}
        author={build.author}
        activity={activityName(build.category)}
        tags={build.tags}
        updatedAt={build.updatedAt}
        itemId={main?.itemId}
        actions={
          <>
            {copyAvailable && <ArchiveBuildCopyLink slug={build.slug} />}
            <LibrarySaveButton build={savedBuild} showLabel />
            <BuildShareControls
              title={build.title}
              equipment={equipment.map((item) => ({
                slot: item.slot,
                itemId: item.itemId,
                quality: item.quality,
                name: equipmentName(item.itemId),
                qualityNote: "Normal planning quality",
              }))}
            />
          </>
        }
      />
      <BuildDetailNavigation />
      <BuildLoadoutView
        equipment={equipment}
        qualityAssumed
        extraActions={
          <BuildCompositionLink fromLibrary={build.slug.length <= 200 ? build.slug : build.id} />
        }
        information={{
          activity: activityName(build.category),
          author: build.author,
          updatedAt: build.updatedAt,
          tags: build.tags,
        }}
        recommendations={
          build.recommendedTraits.length ? (
            <LibraryBuildTraits ids={build.recommendedTraits} traits={await libraryTraits()} />
          ) : undefined
        }
      />
      <details className="raised detail-disclosure detail-secondary-notes" id="build-notes" open>
        <summary>
          <span>Strategy & creator recordings</span>
          <small>From the author</small>
        </summary>
        <div className="detail-disclosure-content detail-notes-grid">
          <section className="detail-notes-panel">
            <h2>From the author</h2>
            <p className="preserve">
              {brandCopy(build.description) || "No additional strategy notes provided."}
            </p>
            <p className="detail-muted">
              Check ability unlocks and current balance in game. Price checks start with Normal
              quality.
            </p>
          </section>
          <LibraryBuildVideos build={build} />
        </div>
      </details>
      <div id="build-cost">
        <LoadoutPriceCheck equipment={equipment} autoLoad />
      </div>
      <details className="raised detail-disclosure detail-secondary-notes" id="build-discussion">
        <summary>
          <span>Build discussion</span>
          <small>Community options</small>
        </summary>
        <div className="detail-disclosure-content">
          <p className="detail-muted">
            Community builds support comments and shared feedback. Make a personal copy to adjust
            this loadout, or explore player builds.
          </p>
          <Link className="button secondary" href="/builds">
            Browse community builds →
          </Link>
        </div>
      </details>
      <AdSlot placement="article" />
      {!!related.length && (
        <section className="detail-related-builds" aria-label="Related builds">
          <div className="ecosystem-section-heading">
            <h2>More {build.weaponName} builds</h2>
            <Link
              href={`/builds/library?${new URLSearchParams({ q: build.weaponName })}`}
              className="text-link"
            >
              Explore this weapon →
            </Link>
          </div>
          <div className="ecosystem-build-grid">
            {related.map((candidate) => (
              <LibraryBuildCard key={candidate.id} build={candidate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
