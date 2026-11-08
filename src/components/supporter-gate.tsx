import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { supporterMessage } from "@/lib/billing/gate";
import { SupporterBand } from "./supporter-band";
import styles from "./teams.module.css";

/** What a locked Team feature says: who needs the plan, what stays open, where to get it. */
export function SupporterGate({
  kind,
  owner = true,
}: {
  kind: "create" | "manage";
  owner?: boolean;
}) {
  if (kind === "create")
    return (
      <SupporterBand
        id="supporter-gate-title"
        title={
          <>
            Teams are a <em>Supporter</em> feature
          </>
        }
        line="Only the owner needs the plan. Joining a team, RSVPs and shared comps stay free for every member."
        actions={
          <>
            <Link className="button primary" href="/supporter">
              See the Supporter plan <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="button secondary" href="/groups">
              Browse teams
            </Link>
          </>
        }
      />
    );
  return (
    <section className={`well ${styles.gate}`} aria-label="Supporter feature">
      {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
      <img src="/albion/icons/team-roles.webp" alt="" width={48} height={48} />
      <div>
        <h2>Team management is paused</h2>
        <p>
          {owner
            ? `${supporterMessage.manage} Members can still read everything, RSVP and leave; events, announcements, invites, shared builds, loot splits and giveaways wait until you are a Supporter again.`
            : `${supporterMessage.manage} You can still read everything, RSVP and leave.`}
        </p>
      </div>
      {owner && (
        <Link className="button primary" href="/supporter">
          See the Supporter plan <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
