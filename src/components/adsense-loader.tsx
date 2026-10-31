import { headers } from "next/headers";

export const adsenseClient = () => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return client && /^ca-pub-\d{6,20}$/.test(client) ? client : null;
};

/**
 * The AdSense loader on every page once the publisher id is configured: Google verifies
 * site ownership through it and it is what the ad units push into. It is a plain tag in the
 * server HTML (the verifier reads the document, not the hydrated page), carrying the request's
 * CSP nonce; the origins it needs are opened by the middleware under the same switch.
 */
export async function AdsenseLoader() {
  const client = adsenseClient();
  if (!client) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      id="adsense-loader"
      nonce={nonce}
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
