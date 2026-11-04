import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { userIsSupporter } from "@/lib/billing/gate";

/**
 * No advertising request is made until a real consent and withdrawal integration exists.
 * Publisher/slot configuration alone is not consent. Keep the optional, first-party
 * Supporter link separate; current server-side entitlement still suppresses that offer.
 */
export async function AdSlot({
  placement,
  suffix = "",
  offer = false,
}: {
  placement: "hub" | "article";
  suffix?: string;
  offer?: boolean;
}) {
  if (!offer) return null;
  const session = await getServerSession(authOptions);
  if (session?.user?.id && (await userIsSupporter(session.user.id))) return null;
  return (
    <aside className={`ad-slot is-${placement}`} aria-label="Support Outpost">
      <p className="ad-slot-offer">
        <Sparkles size={15} aria-hidden="true" />
        <span>
          Outpost is free to use. <Link href={`/supporter${suffix}`}>About Supporter</Link>
        </span>
      </p>
    </aside>
  );
}
