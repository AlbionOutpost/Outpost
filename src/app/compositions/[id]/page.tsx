import { authoredShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { CommunityPanel } from "@/components/community-panel";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireRead, canEdit, groupRole } from "@/lib/compositions/service";
import { canManageMembers, canEditShared } from "@/lib/groups/permissions";
import { db } from "@/lib/db";
import { readStoredComposition } from "@/lib/compositions/stored";
import { HttpError } from "@/lib/api-errors";
import { WorkspaceHeading } from "@/components/workspace-heading";
import Link from "@/components/build-region-link";
import { CompositionActions, CompositionView } from "@/components/composition-view";
import { CompNextSteps } from "@/components/comp-next-steps";
import styles from "@/components/comps.module.css";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SeoQuery>;
}) {
  return authoredShareMetadata("composition", (await params).id, await searchParams);
}
const regions = { europe: "Europe", americas: "Americas", asia: "Asia" } as const;
const visibility = { PUBLIC: "Public", PRIVATE: "Private", GROUP: "Team only" } as const;
export default async function CompositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let row;
  try {
    row = await requireRead(id, userId);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const editable = !!userId && (await canEdit(row, userId));
  const role = row.groupId ? await groupRole(db, row.groupId, userId) : null;
  const deletable =
    row.visibility === "GROUP"
      ? (row.authorId === userId && canEditShared(role)) || canManageMembers(role)
      : row.authorId === userId;
  const { composition, dropped } = readStoredComposition(row);
  const updated = row.updatedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title={composition.title}
        description={
          composition.description.trim() ||
          `A ${composition.slots.length}-player ${composition.contentType} comp. Open a member for their loadout.`
        }
        actions={
          <CompositionActions
            id={id}
            composition={composition}
            editable={editable}
            deletable={deletable}
          />
        }
      >
        <div className={`landing-chips masthead-chips ${styles.mastChips}`}>
          <span className="landing-chip">{composition.contentType}</span>
          <span className="landing-chip is-muted">{visibility[composition.visibility]}</span>
          <span className="landing-chip is-muted">{regions[composition.region]}</span>
          <span className="landing-chip is-muted">Revision {row.version}</span>
          <span className="landing-chip is-muted">
            <time dateTime={row.updatedAt.toISOString()}>{`Updated ${updated}`}</time>
          </span>
        </div>
        <Link className="pill-link is-small masthead-back" href="/compositions">
          <ArrowLeft size={14} aria-hidden="true" /> All comps
        </Link>
      </WorkspaceHeading>
      <CompositionView id={id} composition={composition} editable={editable} dropped={dropped} />
      <CommunityPanel kind="composition" id={id} />
      <CompNextSteps
        show={["builds", "library", "teams"]}
        title={
          <>
            Fill every <em>slot</em>
          </>
        }
        line="Find a build for an open slot, compare with recorded comps, or share this one with your Team."
      />
    </div>
  );
}
