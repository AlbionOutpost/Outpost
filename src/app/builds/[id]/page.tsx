import { CommunityPanel } from "@/components/community-panel";
import { SavedEquipmentSets } from "@/components/saved-equipment-sets";
import { equipmentSets } from "@/lib/albion/equipment-sets";
import { BuildLoadoutView } from "@/components/build-loadout-view";
import { BuildActions } from "@/components/build-actions";
import { BuildCost } from "@/components/build-cost";
import Link from "@/components/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canReadBuild } from "@/lib/builds/validation";
export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const build = await db.build.findUnique({
    where: { id },
    include: {
      equipment: true,
      author: { select: { name: true, id: true } },
      versions: {
        select: { version: true, createdAt: true },
        orderBy: { version: "desc" },
        take: 20,
      },
    },
  });
  if (
    !build ||
    (build.hiddenAt && build.authorId !== session?.user?.id) ||
    !canReadBuild(build.visibility, build.authorId, session?.user?.id)
  )
    notFound();
  return (
    <div className="build-detail-page">
      <div className="build-detail-classification">
        {build.contentType} · {build.visibility} · REVISION {build.version}
      </div>
      <div className="section-heading">
        <h1 className="page-title display-title">{build.title}</h1>
        {session?.user?.id === build.authorId && (
          <Link className="button primary" href={`/builds/${id}/edit`}>
            Edit build
          </Link>
        )}
      </div>
      <p className="intro">
        By{" "}
        <Link className="text-link" href={`/players/${build.author.id}`}>
          {build.author.name || "Adventurer"}
        </Link>{" "}
        · {build.region} · {build.playerCount} {build.playerCount === 1 ? "player" : "players"} ·
        Recommended IP {build.recommendedIP || "not specified"} (author estimate)
      </p>
      {build.description && (
        <p className="build-detail-description preserve">{build.description}</p>
      )}
      <nav className="build-section-navigation" aria-label="Build sections">
        <a href="#build-equipment">Loadout</a>
        <a href="#build-notes">Strategy & notes</a>
        <a href="#build-cost">Replacement cost</a>
        <a href="#build-discussion">Discussion</a>
      </nav>
      <BuildLoadoutView equipment={build.equipment} region={build.region} />
      <p className="muted">
        Created{" "}
        <time dateTime={build.createdAt.toISOString()}>
          {build.createdAt.toISOString().slice(0, 10)}
        </time>{" "}
        · Updated{" "}
        <time dateTime={build.updatedAt.toISOString()}>
          {build.updatedAt.toISOString().slice(0, 10)}
        </time>
      </p>
      <section className="panel section build-author-notes" id="build-notes">
        <h2>Author strategy</h2>
        <p className="preserve">{build.strategy || "No strategy notes provided."}</p>
        <h2 className="section">Patch / version notes</h2>
        <p className="preserve">{build.patchNotes || "No patch notes provided."}</p>
        <details>
          <summary>Revision timestamps</summary>
          {build.versions.map((v) => (
            <p key={v.version}>
              Revision {v.version} · {v.createdAt.toISOString()}
            </p>
          ))}
        </details>
      </section>
      <SavedEquipmentSets sets={equipmentSets.parse(build.equipmentSets)} />
      <BuildActions
        id={id}
        version={build.version}
        owner={session?.user?.id === build.authorId}
        revisions={build.versions.map((v) => v.version)}
      />
      <div id="build-cost">
        <BuildCost id={id} />
      </div>
      <div id="build-discussion">
        <CommunityPanel kind="build" id={id} />
      </div>
      <p className="muted">
        Share this page’s URL. Unlisted links grant read access; private builds are visible only to
        the author. Item and ability coverage is limited to the supported catalog.
      </p>
    </div>
  );
}
