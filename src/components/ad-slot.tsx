import { headers } from "next/headers";
import Script from "next/script";
import Link from "@/components/link";
import { Sparkles } from "lucide-react";

/**
 * One advertising unit plus the ad-free offer. The AdSense tag only renders once the owner
 * has set `NEXT_PUBLIC_ADSENSE_CLIENT` (the ca-pub id) so an unconfigured deploy shows no
 * empty frame; the premium line is always there so the ad-free path is visible either way.
 */
export async function AdSlot({
  slot,
  suffix = "",
  compact = false,
}: {
  slot: string;
  suffix?: string;
  compact?: boolean;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const configured = !!client && /^ca-pub-\d{6,20}$/.test(client) && /^\d{6,20}$/.test(slot);
  const nonce = configured ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  return (
    <aside className={`ad-slot${compact ? " is-compact" : ""}`} aria-label="Sponsored">
      {configured && (
        <>
          <Script
            id="adsense-loader"
            nonce={nonce}
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
            crossOrigin="anonymous"
          />
          <ins
            className="adsbygoogle ad-slot-unit"
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format={compact ? "horizontal" : "auto"}
            data-full-width-responsive="true"
          />
          <Script id={`adsense-push-${slot}`} nonce={nonce} strategy="afterInteractive">
            {"(adsbygoogle = window.adsbygoogle || []).push({});"}
          </Script>
        </>
      )}
      <p className="ad-slot-offer">
        <Sparkles size={15} aria-hidden="true" />
        <span>
          {configured ? "Prefer Outpost without ads?" : "Outpost is free to use."}{" "}
          <Link href={`/premium${suffix}`}>Go ad-free with Premium</Link>
        </span>
      </p>
    </aside>
  );
}
