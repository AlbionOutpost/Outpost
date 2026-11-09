import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { userIsAdFree } from "@/lib/billing/gate";
import { adsActive } from "@/components/adsense-loader";
import { AdUnit } from "@/components/ad-unit";

const slotIds = {
  hub: () => process.env.NEXT_PUBLIC_ADSENSE_SLOT_HUB,
  article: () => process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE,
};

/**
 * One ad unit after a hub's list or a guide/library build, only while ads are active (see
 * adsActive) and the placement has a unit id; the optional first-party Supporter link instead
 * when `offer` is set. Supporters (plan or gift, not the launch grant) see neither, checked
 * against the current server record.
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
  const client = offer ? null : adsActive();
  const slot = slotIds[placement]();
  if (!offer && !(client && slot && /^\d{6,20}$/.test(slot))) return null;
  const session = await getServerSession(authOptions);
  if (session?.user?.id && (await userIsAdFree(session.user.id))) return null;
  if (client && slot)
    return (
      <aside className={`ad-slot is-${placement}`} aria-label="Advertisement">
        <span className="ad-slot-label">Advertisement</span>
        <AdUnit client={client} slot={slot} />
      </aside>
    );
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
