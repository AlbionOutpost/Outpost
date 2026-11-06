import { authoredShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
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
import { BuildsNextStep } from "@/components/builds-next-step";
import { BuildShareControls } from "@/components/build-share-controls";
import { equipmentName } from "@/lib/albion/equipment-catalog";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SeoQuery>;
}) {
  return authoredShareMetadata("build", (await params).id, await searchParams);
}
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
        collection="community"
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
        cost={
          <div id="build-cost" className="raised detail-panel-frame">
            <BuildCost id={id} />
          </div>
        }
        notes={
          <details className="detail-disclosure detail-secondary-notes" id="build-notes" open>
            <summary>
              <span>From the author</span>
              <small>Strategy and patch notes</small>
            </summary>
            <div className="detail-disclosure-content detail-notes-grid">
              <section className="detail-notes-panel" aria-label="Author strategy">
                {/* The masthead shows a short description in full; a long one reads here */}
                {build.description.length > 160 && <p className="preserve">{build.description}</p>}
                <h3>Strategy</h3>
                <p className="preserve">{build.strategy || "The author left no strategy notes."}</p>
              </section>
              <section className="detail-notes-panel" aria-label="Patch notes">
                <h3>Patch notes</h3>
                <p className="preserve">{build.patchNotes || "No patch notes."}</p>
                {build.versions.length > 0 && (
                  <p className="detail-muted">
                    Revision {build.versions[0].version} saved{" "}
                    <time dateTime={build.versions[0].createdAt.toISOString()}>
                      {build.versions[0].createdAt.toISOString().slice(0, 10)}
                    </time>
                    .
                  </p>
                )}
              </section>
            </div>
          </details>
        }
      />
      <SavedEquipmentSets sets={equipmentSets.parse(build.equipmentSets)} />
      <div id="build-actions" className="raised detail-panel-frame">
        <BuildActions
          id={id}
          version={build.version}
          owner={session?.user?.id === build.authorId}
          revisions={build.versions.map((v) => v.version)}
        />
      </div>
      <div id="build-discussion" className="raised detail-panel-frame">
        <CommunityPanel kind="build" id={id} />
      </div>
      <BuildsNextStep
        title={
          <>
            Plan <em>around</em> it
          </>
        }
        line="Put this build in a comp so your Team knows who runs what, or start one of your own."
        secondary={{ href: "/compositions", label: "Plan a comp" }}
      />
    </div>
  );
}
