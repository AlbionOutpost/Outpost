import { CommunityPanel } from "@/components/community-panel";
import { SavedEquipmentSets } from "@/components/saved-equipment-sets";
import { equipmentSets } from "@/lib/albion/equipment-sets";
import { BuildLoadoutView } from "@/components/build-loadout-view";
import { BuildActions } from "@/components/build-actions";
import { BuildCost } from "@/components/build-cost";
import { BuildCompositionLink } from "@/components/build-composition-link";
import Link from "@/components/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canReadBuild } from "@/lib/builds/validation";
import { BuildDetailHeader, BuildDetailNavigation } from "@/components/build-detail-header";
import { BuildShareControls } from "@/components/build-share-controls";
import { equipmentName } from "@/lib/albion/equipment-catalog";
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
    <div className="build-detail-page build-detail-redesign">
      <BuildDetailHeader
        title={build.title}
        description={build.description}
        author={build.author.name || "Adventurer"}
        authorHref={`/players/${build.author.id}`}
        activity={build.contentType}
        updatedAt={build.updatedAt.toISOString()}
        revision={build.version}
        visibility={build.visibility}
        itemId={build.equipment.find((item) => item.slot === "Main hand")?.itemId}
        actions={
          <>
            {session?.user?.id !== build.authorId && (
              <BuildActions id={id} version={build.version} owner={false} revisions={[]} compact />
            )}
            {session?.user?.id === build.authorId && (
              <Link className="button primary" href={`/builds/${id}/edit`}>
                Edit build
              </Link>
            )}
            {session?.user?.id === build.authorId && (
              <a className="button secondary" href="#build-actions">
                Revisions
              </a>
            )}
            <BuildShareControls
              title={build.title}
              equipment={build.equipment.map((item) => ({
                slot: item.slot,
                itemId: item.itemId,
                quality: item.quality,
                name: equipmentName(item.itemId),
              }))}
              privateBuild={build.visibility === "PRIVATE"}
            />
          </>
        }
      />
      <BuildDetailNavigation />
      <BuildLoadoutView
        equipment={build.equipment}
        region={build.region}
        extraActions={<BuildCompositionLink fromBuild={build.id} />}
        information={{
          activity: build.contentType,
          author: build.author.name || "Adventurer",
          updatedAt: build.updatedAt.toISOString(),
          version: build.version,
          playerCount: build.playerCount,
          recommendedIP: build.recommendedIP,
          visibility: build.visibility,
        }}
      />
      <section className="detail-notes-panel" id="build-notes">
        {build.description && (
          <>
            <h2>Build overview</h2>
            <p className="preserve">{build.description}</p>
          </>
        )}
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
      <div id="build-actions">
        <BuildActions
          id={id}
          version={build.version}
          owner={session?.user?.id === build.authorId}
          revisions={build.versions.map((v) => v.version)}
        />
      </div>
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
