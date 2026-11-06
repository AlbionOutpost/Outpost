import { archiveShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import Link from "@/components/build-region-link";
import { CompNextSteps } from "@/components/comp-next-steps";
import styles from "@/components/comps.module.css";
import { notFound } from "next/navigation";
import { findLibraryBuilds, findLibraryComposition, librarySpellNames } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { LibraryGroupWorkspace } from "@/components/library-group-workspace";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { HeartChip } from "@/components/heart-chip";
import { ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbList } from "@/lib/structured-data";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SeoQuery>;
}) {
  return archiveShareMetadata("composition", (await params).slug, await searchParams);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const composition = await findLibraryComposition(slug);
  if (!composition) notFound();
  const builds = await findLibraryBuilds([...new Set(composition.members)]);
  const allNames = await librarySpellNames();
  const spellNames = Object.fromEntries(
    [
      ...new Set(
        builds.flatMap((build) =>
          build.equipment.flatMap((row) => [
            ...row.skills,
            ...Object.values(row.alternativeSkills || {}).flat(),
          ]),
        ),
      ),
    ].map((id) => [id, allNames[id] || id]),
  );
  // Short author notes read as the masthead line; longer ones open under the party heading.
  const note = composition.description.trim();
  const short = note.length > 0 && note.length <= 220 && !note.includes("\n");
  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Group Builds", path: "/compositions/library" },
          {
            name: composition.title,
            path: `/compositions/library/${encodeURIComponent(composition.slug)}`,
          },
        ])}
      />
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title={composition.title}
        description={
          short
            ? note
            : `A ${composition.members.length}-member comp recorded by ${composition.author}, with every member’s loadout.`
        }
        actions={
          <Link
            className="button primary"
            rel="nofollow"
            href={`/compositions/new?${new URLSearchParams({ fromComposition: composition.slug })}`}
          >
            Copy to my comps
          </Link>
        }
      >
        <div className={`landing-chips masthead-chips ${styles.mastChips}`}>
          <span className="landing-chip">{activityName(composition.category)}</span>
          <span className="landing-chip is-muted">{composition.members.length} members</span>
          <span className="landing-chip is-muted">By {composition.author}</span>
          {composition.upvotes != null && <HeartChip count={composition.upvotes} />}
        </div>
        <Link className="pill-link is-small masthead-back" href="/compositions/library">
          <ArrowLeft size={14} aria-hidden="true" /> All Group Builds
        </Link>
      </WorkspaceHeading>
      <LibraryGroupWorkspace
        composition={composition}
        builds={builds}
        spellNames={spellNames}
        notes={short ? undefined : note || undefined}
      />
      <CompNextSteps
        show={["builds", "library", "create"]}
        title={
          <>
            Make it <em>yours</em>
          </>
        }
        line="Copy this comp to put your players in the slots, or swap a member’s build first."
      />
    </div>
  );
}
