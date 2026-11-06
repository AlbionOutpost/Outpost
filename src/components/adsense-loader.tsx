export const adsenseClient = () => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return client && /^ca-pub-\d{6,20}$/.test(client) ? client : null;
};

/**
 * Ads run only with a valid publisher id and a complete imprint (name, address, email): a site
 * with ads is commercial, and German law asks for the full Impressum first. Google's certified
 * consent message (configured in AdSense) loads with the script and asks EEA, UK and Swiss
 * visitors before any ad request; visitors in US states get Google's opt-out link.
 */
export const adsActive = () =>
  ["OPERATOR_NAME", "OPERATOR_ADDRESS", "OPERATOR_EMAIL"].every((key) => process.env[key]?.trim())
    ? adsenseClient()
    : null;

/**
 * The passive ownership tag whenever a publisher id is set (what Google's site verification
 * reads), plus Google's ad and consent script once ads are active. Supporters never load it.
 * https://support.google.com/adsense/answer/7584263
 */
export function AdsenseLoader({
  nonce,
  supporter = false,
}: { nonce?: string; supporter?: boolean } = {}) {
  const client = adsenseClient();
  if (!client) return null;
  const active = !supporter && adsActive();
  return (
    <>
      <meta name="google-adsense-account" content={client} />
      {active && (
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
          crossOrigin="anonymous"
          nonce={nonce}
        />
      )}
    </>
  );
}
