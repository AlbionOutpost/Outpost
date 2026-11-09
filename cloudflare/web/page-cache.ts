/* Signed-out HTML pages kept in the edge cache, so a repeat view of a public page costs no render.
 * docs/ARCHITECTURE.md § Page cache.
 *
 * A page is kept only when every one of these holds:
 * - the request is a GET for a document on an allowlisted public route (below), with no RSC,
 *   router or Server Action header and no `_rsc` query: flight answers always go to the app;
 * - it carries no account cookie (NextAuth's, or any name with auth, session or token in it),
 *   and its theme and server cookies, if any, hold exactly a value the layout understands;
 * - the answer is a 200 HTML document with no Set-Cookie and no `X-Outpost-Partial`, a CSP nonce
 *   in its policy, a complete body (it ends with `</html>`, so a render cut off by the deadline
 *   is never kept) and no streamed not-found, redirect or error boundary in it.
 *
 * Every page answer carries `Cache-Control: private, no-store` from src/proxy.ts; that is the
 * browser's rule (a signed-out copy must never outlive a sign-in) and stays on hits too.
 *
 * The key is the deploy version, the page's own URL with its query exactly as sent (the page
 * embeds its URL in the router payload, so a reordered query is another page), and the two
 * cookies that change a signed-out render: `atlas-theme` (the `light` class) and `atlas-region`.
 * Click-tracking parameters, repeated or oversized queries are never kept.
 *
 * The CSP nonce: the page is stored as rendered, nonce included. Each hit draws a fresh nonce
 * and replaces every occurrence of the stored one: script `nonce` attributes, the `"nonce"`
 * props React writes into the flight payload (font and stylesheet hints), the `Link` preload
 * header and the policy header, so no two visitors share one. The replacement has the same
 * length, so any length-prefixed flight row stays valid. Only the exact 48-character value the
 * render used is replaced, so a `nonce` attribute that did not come from the render (rewriting
 * every `nonce=` with HTMLRewriter would bless an injected one) never becomes valid. */

/** Live-ish pages and pages that list players' public content: a build made private drops out
 * within a minute. Reference pages (library, guides, tools, items): five minutes. */
const LIVE = 60;
const REFERENCE = 300;
/** Item pages list three community builds for the weapon; two minutes, as signed-out search. */
const ITEM = 120;
const slug = "[A-Za-z0-9_-]{1,120}";
const tools = [
  "alchemy",
  "avalon-mapper",
  "black-market",
  "cooking",
  "crafting",
  "enchanting",
  "farming",
  "fishing",
  "flipping",
  "gold",
  "laborers",
  "mastery",
  "profitable-crafts",
  "reference",
  "refining",
  "transporting",
];

/** The public routes whose signed-out render is the same for every visitor. Anything not listed
 * (editors, account, admin, sign-in, giveaways, players, invitations, legal) always renders.
 * A player's own build, comp or Team page is left out on purpose: making it private or hiding
 * it must take effect at once (e2e/seo.spec.ts), and a kept copy would show it for a minute. */
export const pageRoutes: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\/$/, LIVE],
  [/^\/market-data$/, LIVE],
  [/^\/tools\/(?:kill-feed|market)$/, LIVE],
  [/^\/tools$/, REFERENCE],
  [new RegExp(`^/tools/(?:${tools.join("|")})$`), REFERENCE],
  [/^\/builds$/, LIVE],
  [/^\/builds\/activities$/, REFERENCE],
  [new RegExp(`^/builds/library/${slug}$`), REFERENCE],
  [/^\/compositions$/, LIVE],
  [new RegExp(`^/compositions/library/${slug}$`), REFERENCE],
  [/^\/guides$/, REFERENCE],
  [new RegExp(`^/guides/${slug}$`), REFERENCE],
  [/^\/items$/, REFERENCE],
  [/^\/items\/(?:[A-Za-z0-9_@]|%40){3,120}$/, ITEM],
  [/^\/groups$/, LIVE],
];

const tracking =
  /^(?:utm_.*|fbclid|gclid|gbraid|wbraid|dclid|msclkid|yclid|twclid|ttclid|igshid|mc_cid|mc_eid|_ga|_gl)$/i;
const regions = new Set(["europe", "americas", "asia"]);
const themes = new Set(["light", "dark"]);
const MAX_QUERY = 512;
const MAX_PAGE_BYTES = 4 * 1024 * 1024;

/** The cookies as Next parses them (`@edge-runtime/cookies`: split on `; *`, last one wins), so
 * the key reads exactly what the render will read. Null when a cookie could be read differently
 * by the two (repeated, an unexpected value, a look-alike name) or carries an identity. */
function signedOutVariant(header: string | null): { theme: string; region: string } | null {
  if (!header) return { theme: "dark", region: "-" };
  if (/next-auth/i.test(header)) return null;
  const seen = new Map<string, string>();
  for (const pair of header.split(/; */)) {
    if (!pair) continue;
    const at = pair.indexOf("=");
    const name = at === -1 ? pair : pair.slice(0, at);
    const value = at === -1 ? "" : pair.slice(at + 1);
    if (/auth|session|token/i.test(name)) return null;
    if (name === "atlas-theme" || name === "atlas-region") {
      if (seen.has(name)) return null;
      if (!(name === "atlas-theme" ? themes : regions).has(value)) return null;
      seen.set(name, value);
    } else if (/atlas-(?:theme|region)/i.test(name)) return null;
  }
  return { theme: seen.get("atlas-theme") ?? "dark", region: seen.get("atlas-region") ?? "-" };
}

/** True for the App Router's own fetches (RSC payloads, prefetches, Server Actions). */
function routerRequest(request: Request, url: URL) {
  if (url.searchParams.has("_rsc")) return true;
  for (const name of request.headers.keys())
    if (name === "rsc" || name.startsWith("next-")) return true;
  return false;
}

/** The cache key and TTL for a signed-out document request on a public page, or null. */
export function pageCacheEntry(
  request: Request,
  version: string,
): { key: Request; ttl: number } | null {
  if (request.method !== "GET" || !version) return null;
  const url = new URL(request.url);
  const rule = pageRoutes.find(([pattern]) => pattern.test(url.pathname));
  if (!rule || routerRequest(request, url)) return null;
  const names = [...url.searchParams.keys()];
  if (
    url.search.length > MAX_QUERY ||
    new Set(names).size !== names.length ||
    names.some((name) => tracking.test(name))
  )
    return null;
  const variant = signedOutVariant(request.headers.get("Cookie"));
  if (!variant) return null;
  const tag = `${encodeURIComponent(version)}/${variant.theme}/${variant.region}`;
  return {
    key: new Request(`https://${url.hostname}/__page/${tag}${url.pathname}${url.search}`),
    ttl: rule[1],
  };
}

const nonceIn = (policy: string | null) => policy?.match(/'nonce-([A-Za-z0-9+/]{48})'/)?.[1];

/** A nonce as src/proxy.ts makes one: the base64 of a random UUID, always 48 characters. */
export const freshNonce = () => btoa(crypto.randomUUID());

/** The copy to keep, or null when the answer must not be shared (see the top of this file). */
export async function pageToStore(response: Response, ttl: number): Promise<Response | null> {
  const policy = response.headers.get("Content-Security-Policy");
  if (
    response.status !== 200 ||
    !(response.headers.get("Content-Type") || "").startsWith("text/html") ||
    response.headers.has("Set-Cookie") ||
    response.headers.has("X-Outpost-Partial") ||
    !nonceIn(policy)
  )
    return null;
  const html = await response.text();
  if (
    html.length > MAX_PAGE_BYTES ||
    !html.trimEnd().endsWith("</html>") ||
    /NEXT_HTTP_ERROR_FALLBACK|NEXT_REDIRECT|data-dgst=/.test(html)
  )
    return null;
  const stored = new Response(html, {
    headers: {
      "Content-Type": response.headers.get("Content-Type")!,
      "Content-Security-Policy": policy!,
      "Cache-Control": `public, max-age=${ttl}`,
    },
  });
  // Next's font and image preloads; the font ones carry the nonce too.
  const link = response.headers.get("Link");
  if (link) stored.headers.set("Link", link);
  return stored;
}

/** A stored page with a fresh nonce in its body and policy, or null if it cannot be renewed. */
export async function pageFromStore(stored: Response): Promise<Response | null> {
  const policy = stored.headers.get("Content-Security-Policy");
  const old = nonceIn(policy);
  if (!old) return null;
  const nonce = freshNonce();
  const html = (await stored.text()).replaceAll(old, nonce);
  const page = new Response(html, {
    headers: {
      "Content-Type": stored.headers.get("Content-Type") || "text/html; charset=utf-8",
      "Content-Security-Policy": policy!.replaceAll(old, nonce),
      "Cache-Control": "private, no-store",
      "X-Outpost-Edge": "hit",
    },
  });
  const link = stored.headers.get("Link");
  if (link) page.headers.set("Link", link.replaceAll(old, nonce));
  return page;
}
