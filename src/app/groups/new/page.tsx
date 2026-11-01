import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { GroupCreate } from "@/components/group-create";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SupporterGate } from "@/components/supporter-gate";
import { canCreateTeam } from "@/lib/billing/gate";
export default async function NewGroup() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin");
  const allowed = await canCreateTeam(session.user.id);
  return (
    <div className="support-team-create">
      <WorkspaceHeading
        glyph="guild"
        scene="comps"
        title="Create a team workspace"
        description="Set up a home for your events, shared loadouts and party plans."
      />
      <div className="team-create-layout">
        {allowed ? <GroupCreate /> : <SupporterGate kind="create" />}
        <aside className="panel">
          <h2>A workspace for your people</h2>
          <ol>
            <li>
              <strong>Choose your identity.</strong>
              <p>Name the team and choose its address.</p>
            </li>
            <li>
              <strong>Set its visibility.</strong>
              <p>Keep it private, or let players discover its public profile.</p>
            </li>
            <li>
              <strong>Bring the team in.</strong>
              <p>Manage invitations and permissions after creation.</p>
            </li>
          </ol>
        </aside>
      </div>
    </div>
  );
}
