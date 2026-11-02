import type { OutpostDatabaseBinding } from "../database/web-driver";

const marketRoutes = new Set([
  "/api/market",
  "/api/market/batch",
  "/api/market/qualities",
  "/api/history",
  "/api/transport/prices",
  "/api/economy/prices",
  "/api/laborers/prices",
  "/api/landing/craft",
  "/api/opportunities",
  "/api/combat-events/top",
]);

/** Cloudflare overwrites this address header. Routing cookies and forwarded headers are not identity. */
export async function requestBudget(
  request: Request,
  binding: Pick<OutpostDatabaseBinding, "rateLimit">,
): Promise<Response | null> {
  const address = request.headers.get("cf-connecting-ip");
  if (!address || !/^[0-9a-f:.]{3,45}$/i.test(address))
    return new Response("Trusted client address unavailable", { status: 503 });
  try {
    if (!(await binding.rateLimit(`edge:requests:${address}`, 240, 60)))
      return new Response("Request budget exhausted. Retry shortly.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    const url = new URL(request.url);
    if (url.searchParams.getAll("region").length > 1)
      return new Response("Choose one server", { status: 400 });
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname).replace(/\/+/g, "/").replace(/\/$/, "");
    } catch {
      return new Response("Invalid request path", { status: 400 });
    }
    if (marketRoutes.has(pathname) || /^\/api\/builds\/[^/]+\/cost$/.test(pathname)) {
      const asked = url.searchParams.get("region") || "europe";
      const region = /^(europe|americas|asia)$/.test(asked) ? asked : "invalid";
      if (!(await binding.rateLimit(`edge:market:${region}:${address}`, 20, 60)))
        return new Response("Market request budget exhausted. Retry shortly.", {
          status: 429,
          headers: { "Retry-After": "60" },
        });
    }
  } catch {
    return new Response("Request limiter unavailable. Retry shortly.", {
      status: 503,
      headers: { "Retry-After": "60" },
    });
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
  if (new URL(request.url).protocol === "https:")
    result.headers.set("Strict-Transport-Security", "max-age=31536000");
  return result;
}
