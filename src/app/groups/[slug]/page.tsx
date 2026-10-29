import Link from "@/components/link";
import { GroupProfileEditor } from "@/components/group-profile-editor";
import { canManageMembers } from "@/lib/groups/permissions";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupDashboard } from "@/lib/groups/dashboard";
import { HttpError } from "@/lib/api-errors";
import { GroupDashboard, GroupRequest } from "@/components/group-dashboard";
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
  return (
    <div className="guild-workspace-page support-team-workspace">
      <Link className="team-back-link" href="/groups">
        ← Teams
      </Link>
      <section className="guild-identity-banner">
        <span className="guild-monogram" aria-hidden="true">
          {data.group.name
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase()}
        </span>
        <div>
          <div className="eyebrow">
            {data.group.region} · {data.group.visibility}
          </div>
          <h1 className="page-title display-title">{data.group.name}</h1>
          <p className="intro preserve">{data.group.description}</p>
        </div>
      </section>
      {data.membership && data.dashboard ? (
        <GroupDashboard
          groupId={group.id}
          role={data.membership.role}
          userId={data.membership.userId}
          data={data.dashboard}
          profile={
            canManageMembers(data.membership.role) ? (
              <GroupProfileEditor
                group={{ ...data.group, updatedAt: data.group.updatedAt.toISOString() }}
              />
            ) : null
          }
        />
      ) : (
        <>
          <p>This team is public. Shared resources are available only after membership approval.</p>
          <GroupRequest groupId={group.id} />
        </>
      )}
    </div>
  );
}
