export const adsenseClient = () => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return client && /^ca-pub-\d{6,20}$/.test(client) ? client : null;
};

/**
 * Ownership verification does not need Google's advertising script. Keep this passive
 * metadata in the server HTML, but never start advertising merely because an ID exists.
 * Ad requests remain disabled until a real consent/revocation integration is implemented.
 * https://support.google.com/adsense/answer/7584263
 */
export function AdsenseLoader() {
  const client = adsenseClient();
  if (!client) return null;
  return <meta name="google-adsense-account" content={client} />;
}
