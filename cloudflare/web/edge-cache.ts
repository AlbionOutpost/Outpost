/* Public answers kept in the edge cache for signed-out visitors. Each entry is a GET route whose
 * response depends only on the listed, validated query parameters — never on the visitor — so
 * one answer serves everyone and repeat requests skip the rate-limit object, the render object
 * and the data worker. Anything carrying an account cookie (which can see private builds, comps
 * and Teams) always goes to the app.
 *
 * Search returns user-made public builds and comps, so its TTL is short: a build made private or
 * hidden by moderation drops out of signed-out search within two minutes. */
const regions = new Set(["europe", "americas", "asia"]);
type Rule = { ttl: number; key: (params: URLSearchParams) => string | null };
const rules: Record<string, Rule> = {
  "/api/search": {
    ttl: 120,
    key: (params) => {
      const q = (params.get("q") || "").trim().toLowerCase().replace(/\s+/g, " ");
      return q.length >= 2 && q.length <= 100 ? `q=${encodeURIComponent(q)}` : null;
    },
  },
  "/api/landing": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      return regions.has(region) ? `region=${region}` : null;
    },
  },
  "/api/landing/craft": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      const raw = params.get("batches");
      const batches = raw === null ? 1 : Number(raw);
      if (!regions.has(region) || !Number.isInteger(batches) || batches < 1 || batches > 50)
        return null;
      return `region=${region}&batches=${batches}`;
    },
  },
  "/api/combat-events/top": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      return regions.has(region) ? `region=${region}` : null;
    },
  },
};

export const signedIn = (request: Request) =>
  /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(request.headers.get("Cookie") || "");

/** The normalised cache key and TTL for a cacheable signed-out request, or null. */
export function edgeCacheEntry(request: Request): { key: Request; ttl: number } | null {
  if (request.method !== "GET" || signedIn(request)) return null;
  const url = new URL(request.url);
  const rule = rules[url.pathname];
  if (!rule) return null;
  // Repeated parameters are ambiguous; let the app answer (and reject) them.
  if (new Set(url.searchParams.keys()).size !== [...url.searchParams.keys()].length) return null;
  const query = rule.key(url.searchParams);
  if (query === null) return null;
  return { key: new Request(`https://${url.hostname}${url.pathname}?${query}`), ttl: rule.ttl };
}
