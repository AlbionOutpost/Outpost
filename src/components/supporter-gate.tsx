import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { supporterMessage } from "@/lib/billing/gate";
import { SupporterBand } from "./supporter-band";
import styles from "./teams.module.css";

/**
 * What a locked Team feature says: who needs the plan, what stays open, where to get it.
 * `onSale` (`salesOpen()`, decided on the server) is the only case that links to the plan: with
 * billing off there is nothing to buy, so the page says so instead of sending players to a 404.
 */
export function SupporterGate({
  kind,
  owner = true,
  onSale = false,
}: {
  kind: "create" | "manage";
  owner?: boolean;
  onSale?: boolean;
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
        line={
          onSale
            ? "Creating a team needs the Supporter plan. Joining a team, RSVPs and shared comps stay free for every member."
            : "Creating a team needs the Supporter plan, which is not on sale yet. Joining a team, RSVPs and shared comps stay free for every member."
        }
        actions={
          <>
            {onSale && (
              <Link className="button primary" href="/supporter">
                Become a Supporter <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
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
      {owner && onSale && (
        <Link className="button primary" href="/supporter">
          See the Supporter plan <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
