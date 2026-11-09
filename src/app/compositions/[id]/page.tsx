import { authoredShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { CommunityPanel } from "@/components/community-panel";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireRead, canEdit, groupAccess, canDeleteShared } from "@/lib/compositions/service";
import { db } from "@/lib/db";
import { displayName } from "@/lib/display-name";
import { badgeSelect, storedSupporter } from "@/lib/billing/plan";
import { SupporterBadge } from "@/components/supporter-badge";
import { readStoredComposition } from "@/lib/compositions/stored";
import { HttpError } from "@/lib/api-errors";
import { WorkspaceHeading } from "@/components/workspace-heading";
import Link from "@/components/build-region-link";
import { CompositionActions, CompositionView } from "@/components/composition-view";
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
  const [editable, access, author] = await Promise.all([
    !!userId && canEdit(row, userId),
    row.groupId ? groupAccess(db, row.groupId, userId) : null,
    db.user.findUnique({ where: { id: row.authorId }, select: { name: true, ...badgeSelect } }),
  ]);
  const deletable =
    row.visibility === "GROUP"
      ? canDeleteShared(access, row.authorId === userId)
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
          {author && <span className="landing-chip is-muted">By {displayName(author.name)}</span>}
          {storedSupporter(author) && <SupporterBadge />}
          <span className="landing-chip is-muted">{visibility[composition.visibility]}</span>
          <span className="landing-chip is-muted">{regions[composition.region]}</span>
          <span className="landing-chip is-muted">Revision {row.version}</span>
          <span className="landing-chip is-muted">
            <time dateTime={row.updatedAt.toISOString()}>{`Updated ${updated}`}</time>
          </span>
        </div>
        <Link className="pill-link is-small masthead-back" href="/compositions?view=all">
          <ArrowLeft size={14} aria-hidden="true" /> All comps
        </Link>
      </WorkspaceHeading>
      <CompositionView id={id} composition={composition} editable={editable} dropped={dropped} />
      <CommunityPanel kind="composition" id={id} />
    </div>
  );
}
