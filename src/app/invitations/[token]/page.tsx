import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteHash } from "@/lib/groups/service";
import { AcceptInvite } from "@/components/accept-invite";
export default async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const invitation = await db.groupInvitation.findUnique({
    where: { tokenHash: inviteHash(token) },
    select: {
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      group: { select: { name: true } },
    },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt < new Date()
  )
    return (
      <div className="team-invitation-page support-invitation">
        <section className="panel">
          <h1 className="page-title display-title">Invitation unavailable.</h1>
          <p>
            The link expired, was revoked, or has already been used. Ask a team officer for a new
            link.
          </p>
        </section>
      </div>
    );
  const session = await getServerSession(authOptions);
  return (
    <div className="team-invitation-page support-invitation">
      <section className="panel">
        <p className="invitation-context">A place on the team</p>
        <h1 className="page-title display-title">Join {invitation.group.name}.</h1>
        <p>
          This single-use invitation expires{" "}
          <time dateTime={invitation.expiresAt.toISOString()}>
            {invitation.expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC
          </time>
          . You’ll join with the Member role.
        </p>
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
      </section>
    </div>
  );
}
