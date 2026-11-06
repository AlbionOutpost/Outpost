import "@/app/build-styles";
import { privateMetadata } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SupporterGate } from "@/components/supporter-gate";
import { GroupProfileEditor } from "@/components/group-profile-editor";
import { GroupDashboard, GroupRequest } from "@/components/group-dashboard";
import { PanelHead } from "@/components/panel-head";
import { TeamChips, TeamMark, TeamNextSteps } from "@/components/group-parts";
import { teamManagementOpen } from "@/lib/billing/gate";
import { canManageMembers } from "@/lib/groups/permissions";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupDashboard } from "@/lib/groups/dashboard";
import { HttpError } from "@/lib/api-errors";
import styles from "@/components/teams.module.css";
export const metadata = privateMetadata("Team workspace");
/** The request's clock, read once per server render. */
const renderedAt = () => Date.now();
export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const group = await db.group.findUnique({ where: { slug }, select: { id: true } });
  if (!group) notFound();
  let data;
  try {
    data = await groupDashboard(group.id, session?.user?.id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  if (data.membership && data.dashboard)
    return (
      <div className={styles.page}>
        <GroupDashboard
          groupId={group.id}
          role={data.membership.role}
          userId={data.membership.userId}
          data={data.dashboard}
          group={data.group}
          // One clock for the server render and hydration: upcoming vs past never flips.
          now={renderedAt()}
          gate={
            (await teamManagementOpen(group.id)) ? undefined : (
              <SupporterGate kind="manage" owner={data.group.ownerId === data.membership.userId} />
            )
          }
          profile={
            canManageMembers(data.membership.role) ? (
              <GroupProfileEditor
                group={{ ...data.group, updatedAt: data.group.updatedAt.toISOString() }}
              />
            ) : null
          }
        />
      </div>
    );
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        scene="comps"
        emblem={<TeamMark name={data.group.name} />}
        title={data.group.name}
        description={data.group.description || "A Team workspace on Outpost."}
      >
        <TeamChips
          region={data.group.region}
          visibility={data.group.visibility}
          members={data.group._count.members}
        />
        <Link className="pill-link is-small masthead-back" href="/groups">
          <ArrowLeft size={14} aria-hidden="true" /> All teams
        </Link>
      </WorkspaceHeading>
      <section className={`panel ${styles.panel} ${styles.ask}`} aria-labelledby="team-ask">
        <PanelHead
          id="team-ask"
          emblem="team-roles"
          title="Ask to join"
          line="This team is public. Its events, comps and loot splits open once an owner or admin approves you."
        />
        <GroupRequest groupId={group.id} />
      </section>
      <TeamNextSteps />
    </div>
  );
}
