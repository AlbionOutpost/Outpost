import { headers } from "next/headers";
import Script from "next/script";
import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { userIsSupporter } from "@/lib/billing/gate";

/**
 * Advertising that stays out of the way. Two placements, one unit per page at most:
 * `hub` after a page's main list or results, `article` after a guide or build's content. Never
 * inside a working panel, an editor, a Team workspace or account pages; never sticky, never an
 * interstitial. The AdSense tag renders only when the owner has set the client and the
 * placement's slot id, so an unconfigured deploy shows no empty frame. Supporters see nothing.
 * `offer` adds the one-line Supporter offer (the landing keeps it even without ads).
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
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot =
    placement === "hub"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_HUB
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE;
  const configured =
    !!client && /^ca-pub-\d{6,20}$/.test(client) && !!slot && /^\d{6,20}$/.test(slot);
  // Supporters see no advertising anywhere: the plan is read from the account, never the client.
  const session = await getServerSession(authOptions);
  if (session?.user?.id && (await userIsSupporter(session.user.id))) return null;
  if (!configured && !offer) return null;
  const nonce = configured ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  return (
    <aside className={`ad-slot is-${placement}`} aria-label="Sponsored">
      {configured && (
        <>
          <Script
            id="adsense-loader"
            nonce={nonce}
            async
            strategy="lazyOnload"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
            crossOrigin="anonymous"
          />
          <ins
            className="adsbygoogle ad-slot-unit"
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <Script id={`adsense-push-${slot}`} nonce={nonce} strategy="lazyOnload">
            {"(adsbygoogle = window.adsbygoogle || []).push({});"}
          </Script>
        </>
      )}
      {(offer || configured) && (
        <p className="ad-slot-offer">
          <Sparkles size={15} aria-hidden="true" />
          <span>
            {configured ? "Prefer Outpost without ads?" : "Outpost is free to use."}{" "}
            <Link href={`/supporter${suffix}`}>Support Outpost and go ad-free</Link>
          </span>
        </p>
      )}
    </aside>
  );
}
