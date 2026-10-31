import { Lock, ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { supporterMessage } from "@/lib/billing/gate";

/** What a locked Team feature says: who needs the plan, what stays open, where to get it. */
export function SupporterGate({
  kind,
  owner = true,
}: {
  kind: "create" | "manage";
  owner?: boolean;
}) {
  return (
    <section className="raised supporter-gate" aria-label="Supporter feature">
      <span className="supporter-gate-mark" aria-hidden="true">
        <Lock size={20} />
      </span>
      <div>
        <h2>{kind === "create" ? "Teams are a Supporter feature" : "Team management is paused"}</h2>
        <p>
          {kind === "create"
            ? `${supporterMessage.create} Joining a team, RSVPs and shared comps stay free for every member.`
            : owner
              ? `${supporterMessage.manage} Members can still read everything, RSVP and leave; events, announcements, invites, shared builds and loot splits wait until you support Outpost again.`
              : `${supporterMessage.manage} You can still read everything, RSVP and leave.`}
        </p>
      </div>
      {(kind === "create" || owner) && (
        <Link className="button primary" href="/supporter">
          See the Supporter plan <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}
