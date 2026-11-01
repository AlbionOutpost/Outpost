import Link from "@/components/link";
import { notFound } from "next/navigation";
import { findLibraryBuilds, findLibraryComposition, librarySpellNames } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { LibraryGroupWorkspace } from "@/components/library-group-workspace";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { HeartChip } from "@/components/heart-chip";
import { ArrowLeft } from "lucide-react";
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
  return (
    <div className="library-page group-build-detail">
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title={composition.title}
        description="Open a member’s loadout to inspect their equipment, spells and alternatives."
      >
        <div className="landing-chips masthead-chips">
          <span className="landing-chip">{activityName(composition.category)}</span>
          <span className="landing-chip is-muted">{composition.members.length} slots</span>
          <span className="landing-chip is-muted">By {composition.author}</span>
          {composition.upvotes != null && <HeartChip count={composition.upvotes} />}
        </div>
        <Link className="pill-link is-small masthead-back" href="/compositions/library">
          All Group Builds <ArrowLeft size={14} />
        </Link>
      </WorkspaceHeading>
      {composition.description && (
        <section className="raised library-author-notes">
          <h2>Party notes</h2>
          <p className="preserve">{composition.description}</p>
        </section>
      )}
      <LibraryGroupWorkspace composition={composition} builds={builds} spellNames={spellNames} />
    </div>
  );
}
