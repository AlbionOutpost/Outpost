import Link from "@/components/link";
import { notFound } from "next/navigation";
import { findLibraryBuilds, findLibraryComposition } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { LibraryBuildCard } from "@/components/library-build-card";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const composition = await findLibraryComposition(slug);
  if (!composition) notFound();
  const builds = await findLibraryBuilds([...new Set(composition.members)]);
  const memberBuilds = new Map(builds.map((build) => [build.id, build]));
  return (
    <div className="library-page">
      <Link className="library-back-link" href="/compositions/library">
        ← Composition library
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
      <div className="library-comp-members">
        {composition.members.map((id, index) => {
          const build = memberBuilds.get(id);
          return (
            <section key={index}>
              <div className="library-member-label">
                Slot {index + 1}
                {composition.optional.includes(id) && <span>Optional</span>}
              </div>
              {build ? (
                <LibraryBuildCard build={build} />
              ) : (
                <div className="panel">
                  <h2>Loadout unavailable</h2>
                  <p>This member’s loadout is unavailable. Choose another build for this slot.</p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
