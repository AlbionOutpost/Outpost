import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/link";
import { authOptions } from "@/lib/auth";
import { GroupCreate } from "@/components/group-create";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SupporterGate } from "@/components/supporter-gate";
import { PanelHead } from "@/components/panel-head";
import { canCreateTeam } from "@/lib/billing/gate";
import styles from "@/components/teams.module.css";
import ceremony from "@/components/group-create.module.css";
import { signInPath } from "@/lib/sign-in-return";
export const metadata = privateMetadata("Create a Team");

/** What a workspace holds, in the landing's Team Management words. */
const features = [
  ["team-announce", "Announcements", "Post the time, the mass-up and the comp"],
  ["team-calendar", "Events & RSVPs", "Members answer; every event exports to a calendar"],
  ["team-comps", "Shared comps and builds", "Everyone gears the same sets"],
  ["team-loot", "Loot splits", "Haul, repairs and shares, split and kept"],
  ["team-roles", "Roles & invites", "Owner, admins, officers, members · private by default"],
] as const;

export default async function NewGroup() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(signInPath("/groups/new"));
  const allowed = await canCreateTeam(session.user.id);
  const featureList = (
    <section className={`panel ${styles.panel}`} aria-labelledby="team-includes">
      <PanelHead id="team-includes" title="In every workspace" />
      <ul className={styles.list}>
        {features.map(([emblem, name, line]) => (
          <li key={emblem} className={`well ${styles.wellRow}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img src={`/albion/icons/${emblem}.webp`} alt="" width={40} height={40} />
            <span className={styles.rowCopy}>
              <strong>{name}</strong>
              <small className={styles.wrap}>{line}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        scene="comps"
        glyph="guild"
        title="Create a team"
        accent="team"
        description="Five steps to a home for your guild's events, shared loadouts and party plans."
      >
        <Link className="pill-link is-small masthead-back" href="/groups">
          <ArrowLeft size={14} aria-hidden="true" /> All teams
        </Link>
      </WorkspaceHeading>
      {allowed ? (
        <GroupCreate>
          <div className={ceremony.includes}>
            <p>Your workspace comes with</p>
            <ul>
              {features.map(([emblem, name]) => (
                <li key={emblem}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                  <img src={`/albion/icons/${emblem}-64w.webp`} alt="" width={32} height={32} />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </GroupCreate>
      ) : (
        <>
          <div className={styles.createLayout}>{featureList}</div>
          <SupporterGate kind="create" />
        </>
      )}
    </div>
  );
}
