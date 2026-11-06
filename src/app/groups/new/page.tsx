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
import { TeamNextSteps } from "@/components/group-parts";
import { canCreateTeam } from "@/lib/billing/gate";
import styles from "@/components/teams.module.css";
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
  if (!session?.user?.id) redirect("/signin");
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
        description="A private home for your guild's events, shared loadouts and party plans."
      >
        <Link className="pill-link is-small masthead-back" href="/groups">
          <ArrowLeft size={14} aria-hidden="true" /> All teams
        </Link>
      </WorkspaceHeading>
      {allowed ? (
        <>
          <div className={styles.createLayout}>
            <GroupCreate />
            {featureList}
          </div>
          <TeamNextSteps />
        </>
      ) : (
        <>
          <div className={styles.createLayout} data-locked="">
            {featureList}
          </div>
          <SupporterGate kind="create" />
        </>
      )}
    </div>
  );
}
