import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { GroupCreate } from "@/components/group-create";
export default async function NewGroup() {
  if (!(await getServerSession(authOptions))) redirect("/signin");
  return (
    <div className="support-team-create">
      <h1 className="page-title display-title">Create a team workspace</h1>
      <p className="intro">Set up a home for your events, shared loadouts and party plans.</p>
      <div className="team-create-layout">
        <GroupCreate />
        <aside>
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
