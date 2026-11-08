import type { OutpostDatabaseBinding } from "../database/web-driver";
import { addressBucket } from "../../src/lib/client-address";

const marketRoutes = new Set([
  "/api/market",
  "/api/market/batch",
  "/api/market/qualities",
  "/api/history",
  "/api/transport/prices",
  "/api/economy/prices",
  "/api/economy/crafts",
  "/api/economy/black-market",
  "/api/laborers/prices",
  "/api/landing",
  "/api/landing/craft",
  "/api/opportunities",
  "/api/combat-events/top",
]);

/** API callers must receive their JSON error contract even when denied before Next runs. */
function denied(request: Request, message: string, status: number, retry = false) {
  const headers = { "Cache-Control": "no-store", ...(retry ? { "Retry-After": "60" } : {}) };
  return new URL(request.url).pathname.startsWith("/api/")
    ? Response.json({ error: message }, { status, headers })
    : new Response(message, { status, headers });
}

/** Cloudflare overwrites this address header. Routing cookies and forwarded headers are not identity.
 * IPv6 clients are counted per /64 so rotating through one allocation does not reset the budget. */
export async function requestBudget(
  request: Request,
  binding: Pick<OutpostDatabaseBinding, "rateLimit">,
): Promise<Response | null> {
  const address = request.headers.get("cf-connecting-ip");
  if (!address || !/^[0-9a-f:.]{3,45}$/i.test(address))
    return denied(request, "Trusted client address unavailable", 503);
  const client = addressBucket(address);
  try {
    if (!(await binding.rateLimit(`edge:requests:${client}`, 240, 60)))
      return denied(request, "Too many requests. Please wait a minute, then retry.", 429, true);
    const url = new URL(request.url);
    if (url.searchParams.getAll("region").length > 1)
      return denied(request, "Choose one server", 400);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname).replace(/\/+/g, "/").replace(/\/$/, "");
    } catch {
      return denied(request, "Invalid request path", 400);
    }
    // Uncached search scans builds, comps and Teams in the one private store: a caller who
    // varies the query (or sends a session cookie) misses the edge cache on every request.
    if (pathname === "/api/search" && !(await binding.rateLimit(`edge:search:${client}`, 30, 60)))
      return denied(request, "Too many searches. Please wait a minute, then retry.", 429, true);
    if (marketRoutes.has(pathname) || /^\/api\/builds\/[^/]+\/cost$/.test(pathname)) {
      const asked = url.searchParams.get("region") || "europe";
      const region = /^(europe|americas|asia)$/.test(asked) ? asked : "invalid";
      if (!(await binding.rateLimit(`edge:market:${region}:${client}`, 20, 60)))
        return denied(
          request,
          "Too many market requests. Please wait a minute, then refresh.",
          429,
          true,
        );
    }
  } catch {
    return denied(
      request,
      "Requests are temporarily unavailable. Please retry shortly.",
      503,
      true,
    );
  }
  return null;
}

/** Used on every response path, including anonymous cache hits, denials and redirects. */
export function secureResponse(response: Response, request: Request) {
  const result = new Response(response.body, response);
  result.headers.set("X-Content-Type-Options", "nosniff");
  result.headers.set("X-Frame-Options", "DENY");
  result.headers.set(
    "Referrer-Policy",
    new URL(request.url).pathname.startsWith("/invitations/")
      ? "no-referrer"
      : "strict-origin-when-cross-origin",
  );
  result.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // API answers are data, never documents: nothing in them may load, run or be framed. NextAuth's
  // own HTML endpoints under /api/auth keep the app policy set by the proxy.
  const path = new URL(request.url).pathname;
  if (
    path.startsWith("/api/") &&
    !path.startsWith("/api/auth/") &&
    !result.headers.has("Content-Security-Policy")
  )
    result.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (new URL(request.url).protocol === "https:")
    result.headers.set("Strict-Transport-Security", "max-age=31536000");
  return result;
}
