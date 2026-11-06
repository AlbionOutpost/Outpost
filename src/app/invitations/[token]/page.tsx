import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "@/components/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteHash } from "@/lib/groups/service";
import { AcceptInvite } from "@/components/accept-invite";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SystemPage } from "@/components/system-page";
import { PanelHead } from "@/components/panel-head";
import { TeamChips, TeamMark, TeamNextSteps } from "@/components/group-parts";
import styles from "@/components/teams.module.css";
export const metadata = privateMetadata("Team invitation");

/** "in 23 hours", "in 5 days": how long the link stays open, from the server's clock. */
function untilText(at: Date) {
  const hours = Math.max(0, Math.round((at.getTime() - Date.now()) / 3600000));
  if (hours < 1) return "in less than an hour";
  if (hours < 48) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `in ${Math.round(hours / 24)} days`;
}

export default async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const invitation = await db.groupInvitation.findUnique({
    where: { tokenHash: inviteHash(token) },
    select: {
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      group: {
        select: {
          name: true,
          description: true,
          region: true,
          visibility: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
  const session = await getServerSession(authOptions);
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt < new Date()
  )
    return (
      <>
        <SystemPage
          emblem="team-roles"
          eyebrow="Team invitation"
          title={
            <>
              Invitation <em>unavailable</em>
            </>
          }
          line="The link expired, was revoked or has already been used. Ask a team officer for a new one."
          actions={
            <>
              <Link className="button primary" href="/groups">
                Find a team
              </Link>
              {session ? (
                <Link className="button secondary" href="/dashboard">
                  Your dashboard
                </Link>
              ) : (
                <Link className="button secondary" href="/signin">
                  Sign in
                </Link>
              )}
            </>
          }
        />
        <div className={styles.page}>
          <TeamNextSteps />
        </div>
      </>
    );
  const { group } = invitation;
  const words = group.name.trim().split(/\s+/);
  const expires = invitation.expiresAt;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        scene="comps"
        emblem={<TeamMark name={group.name} />}
        title={`Join ${group.name}`}
        accent={words.at(-1)}
        description={
          group.description || "You have been invited to this team's workspace on Outpost."
        }
      >
        <TeamChips
          region={group.region}
          visibility={group.visibility}
          members={group._count.members}
        />
      </WorkspaceHeading>
      <section
        className={`panel ${styles.panel} ${styles.ask} ${styles.centred}`}
        aria-labelledby="invite-title"
      >
        <PanelHead
          id="invite-title"
          emblem="team-roles"
          title="Your invitation"
          line="Accepting adds you to the team; an owner or admin can change your role afterwards."
        />
        <dl className={styles.facts}>
          <div>
            <dt>You join as</dt>
            <dd>Member</dd>
          </div>
          <div>
            <dt>Link expires</dt>
            <dd>
              <time
                dateTime={expires.toISOString()}
                title={`${expires.toISOString().slice(0, 16).replace("T", " ")} UTC`}
              >
                {untilText(expires)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Uses left</dt>
            <dd>1</dd>
          </div>
        </dl>
        <div className={styles.formActions}>
          <Link className="button secondary" href="/groups">
            Not now
          </Link>
          {session ? (
            <AcceptInvite token={token} />
          ) : (
            <Link
              className="button primary"
              href={`/signin?${new URLSearchParams({ callbackUrl: `/invitations/${token}` })}`}
            >
              Sign in to join this team
            </Link>
          )}
        </div>
      </section>
      <TeamNextSteps />
    </div>
  );
}
