import Link from "@/components/link";
import { notFound } from "next/navigation";
import { findLibraryBuilds, findLibraryComposition, librarySpellNames } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { LibraryGroupWorkspace } from "@/components/library-group-workspace";
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
      <Link className="library-back-link" href="/compositions/library">
        ← Group Builds
      </Link>
      <h1 className="page-title display-title">{composition.title}</h1>
      <p className="intro">
        {activityName(composition.category)} · {composition.members.length} slots · By{" "}
        {composition.author}
      </p>
      <p className="library-provenance">
        Open a member’s loadout to inspect their equipment, spells and alternatives.
      </p>
      {composition.description && (
        <section className="library-author-notes">
          <h2>Party notes</h2>
          <p className="preserve">{composition.description}</p>
        </section>
      )}
      <LibraryGroupWorkspace composition={composition} builds={builds} spellNames={spellNames} />
    </div>
  );
}
