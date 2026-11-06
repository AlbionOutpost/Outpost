import { archiveShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
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
import { JsonLd } from "@/components/json-ld";
import { breadcrumbList } from "@/lib/structured-data";
import { brandCopy } from "@/lib/brand-copy";
import { SectionHeading } from "@/components/section-heading";
import { BuildsNextStep } from "@/components/builds-next-step";
import { ArrowRight } from "lucide-react";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SeoQuery>;
}) {
  return archiveShareMetadata("build", (await params).slug, await searchParams);
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
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Build library", path: "/builds/library" },
          { name: build.title, path: `/builds/library/${encodeURIComponent(build.slug)}` },
        ])}
      />
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
        cost={
          <div id="build-cost" className="raised detail-panel-frame">
            <LoadoutPriceCheck equipment={equipment} autoLoad />
          </div>
        }
        notes={
          <details className="detail-disclosure detail-secondary-notes" id="build-notes" open>
            <summary>
              <span>From the author</span>
              <small>Strategy and recordings</small>
            </summary>
            <div className="detail-disclosure-content detail-notes-grid">
              <section className="detail-notes-panel" aria-label="Author notes">
                <p className="preserve">
                  {brandCopy(build.description) || "The author left no strategy notes."}
                </p>
                <p className="detail-muted">
                  Check ability unlocks and current balance in game. Price checks use Normal
                  quality.
                </p>
              </section>
              <LibraryBuildVideos build={build} />
            </div>
          </details>
        }
        discussion={
          <details className="detail-disclosure" id="build-discussion">
            <summary>
              <span>Comments</span>
              <small>On player builds</small>
            </summary>
            <div className="detail-disclosure-content detail-discussion-note">
              <p className="detail-muted">
                Library builds are archived and closed to comments. Make this build yours to change
                it, or talk it through on a player build.
              </p>
              <Link className="pill-link" href="/builds">
                Community builds <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </details>
        }
      />
      <AdSlot placement="article" />
      {!!related.length && (
        <section className="detail-related-builds" aria-label="Related builds">
          <SectionHeading
            title={
              <>
                More <em>{build.weaponName}</em> builds
              </>
            }
            line="Other loadouts in the library built around the same weapon."
            link={{
              href: `/builds/library?${new URLSearchParams({ q: build.weaponName })}`,
              label: "All of them",
            }}
          />
          <div className="ecosystem-build-grid">
            {related.map((candidate) => (
              <LibraryBuildCard key={candidate.id} build={candidate} />
            ))}
          </div>
        </section>
      )}
      <BuildsNextStep
        title={
          <>
            Run it <em>your</em> way
          </>
        }
        line="Start a build of your own from an empty board, or browse every loadout in the library."
        secondary={{ href: "/builds/library", label: "Build library" }}
      />
    </div>
  );
}
