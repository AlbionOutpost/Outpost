import { DurableObject } from "cloudflare:workers";
import app from "../../.open-next/worker.js";

const lifetime = 30 * 60;
const cookieName = "outpost-route";
const bytes = new TextEncoder();
const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
async function identity(request: Request, secret: string) {
  if (!secret || secret.length < 32) throw new Error("Render session secret missing");
  const key = await crypto.subtle.importKey(
    "raw",
    bytes.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const value = request.headers
    .get("Cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  const match = /^([a-f0-9]{32})\.([0-9]{10})\.([a-f0-9]{64})$/.exec(value ?? "");
  const now = Math.floor(Date.now() / 1000);
  if (match && Number(match[2]) <= now && Number(match[2]) + lifetime > now) {
    const signature = Uint8Array.from(match[3].match(/../g)!, (byte) => Number.parseInt(byte, 16));
    if (await crypto.subtle.verify("HMAC", key, signature, bytes.encode(`${match[1]}.${match[2]}`)))
      return { id: match[1], cookie: null };
  }
  const id = crypto.randomUUID().replaceAll("-", ""),
    payload = `${id}.${now}`;
  const signature = hex(await crypto.subtle.sign("HMAC", key, bytes.encode(payload)));
  return {
    id,
    cookie: `${cookieName}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${lifetime}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}

/* Every render ends within RENDER_DEADLINE, streamed body included. A request that never
 * settles (a stalled upstream, a promise nothing resolves) would otherwise hold its session
 * object open for the platform's 15-minute limit and spend the daily Durable Object duration
 * allowance; past the deadline the client gets what has been sent, or a 504 if nothing has. */
const RENDER_DEADLINE = 30_000;
const BACKGROUND_DEADLINE = 10_000;
async function withDeadline(work: Promise<Response>): Promise<Response> {
  let expire: () => void = () => {};
  const expired = new Promise<"expired">((resolve) => {
    expire = () => resolve("expired");
  });
  const timer = setTimeout(() => expire(), RENDER_DEADLINE);
  const first = await Promise.race([work, expired]);
  if (first === "expired") {
    // The render keeps no reference to us; let it fail quietly when it finally settles.
    work.then((late) => late.body?.cancel()).catch(() => {});
    return new Response("Outpost took too long to answer. Please try again.", {
      status: 504,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "5" },
    });
  }
  const response = first;
  if (!response.body) {
    clearTimeout(timer);
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await Promise.race([reader.read(), expired]);
      if (next === "expired") {
        reader.cancel("Render deadline").catch(() => {});
        controller.close();
        return;
      }
      if (next.done) {
        clearTimeout(timer);
        controller.close();
        return;
      }
      controller.enqueue(next.value);
    },
    cancel(reason) {
      clearTimeout(timer);
      return reader.cancel(reason);
    },
  });
  return new Response(body, response);
}

/** A browser-session render actor with an in-memory request budget.
 * Each signed browser session has its own object, never one global renderer. Nothing is written
 * to actor storage: the 30-minute lifetime is enforced by the signed route cookie, and the
 * per-minute budget lives in memory (an evicted object simply starts a fresh window). That keeps
 * every page view free of Durable Object storage writes. NextAuth and the database services still
 * authorize each request against current records.
 * This deliberately uses the Free SQLite DO CPU allowance for the framework's heavy rendering.
 */
export class OutpostSession extends DurableObject<OutpostWebEnv> {
  private window = 0;
  private count = 0;
  async fetch(request: Request) {
    const now = Date.now();
    if (now - this.window >= 60_000) {
      this.window = now;
      this.count = 0;
    }
    if (++this.count > 240)
      return new Response("Request budget exhausted. Retry shortly.", {
        status: 429,
        headers: { "Retry-After": "60", "Cache-Control": "private, no-store" },
      });
    return withDeadline(app.fetch(request, this.env, this.boundedContext()));
  }
  /* Background work the framework hands to waitUntil (cache writes, after() callbacks) keeps the
   * invocation billed until it settles; a promise that never settles kept requests open for
   * the full 15 minutes after their response had been delivered. Each one now gets ten seconds. */
  private boundedContext() {
    const ctx = this.ctx;
    const waitUntil = (promise: Promise<unknown>) =>
      ctx.waitUntil(
        Promise.race([
          Promise.resolve(promise).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, BACKGROUND_DEADLINE)),
        ]),
      );
    return new Proxy(ctx, {
      get(target, property) {
        if (property === "waitUntil") return waitUntil;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  // Objects created before this change may still hold a scheduled cleanup.
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
/* Search for signed-out visitors only ever returns public library, catalog and tool rows, so
 * the same query gives everyone the same answer: it is kept in the edge cache for ten minutes
 * and answered without waking a render object. Anything with an account cookie (which can
 * include private builds, comps and Teams) always goes to the app. */
const SEARCH_TTL = 600;
const signedIn = (request: Request) =>
  /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(request.headers.get("Cookie") || "");
function searchCacheKey(url: URL) {
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (url.pathname !== "/api/search" || q.length < 2 || q.length > 100) return null;
  return new Request(`https://${url.hostname}/api/search?q=${encodeURIComponent(q)}`);
}
const worker = {
  async fetch(request: Request, env: OutpostWebEnv, ctx?: ExecutionContext) {
    const url = new URL(request.url);
    if (url.hostname === "www.albionoutpost.com") {
      url.hostname = "albionoutpost.com";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 308);
    }
    const key = request.method === "GET" && !signedIn(request) ? searchCacheKey(url) : null;
    const cache = key && typeof caches !== "undefined" ? caches.default : null;
    if (cache && key) {
      const hit = await cache.match(key).catch(() => undefined);
      if (hit) {
        const answer = new Response(hit.body, hit);
        answer.headers.set("Cache-Control", "private, max-age=60");
        answer.headers.set("X-Outpost-Search", "hit");
        return answer;
      }
    }
    const session = await identity(request, env.OUTPOST_RENDER_SESSION_SECRET);
    const response = await env.SESSIONS.getByName(session.id).fetch(request);
    const result = new Response(response.body, response);
    if (cache && key && response.status === 200) {
      const body = await result.clone().arrayBuffer();
      const stored = new Response(body, {
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Cache-Control": `public, max-age=${SEARCH_TTL}`,
        },
      });
      const put = cache.put(key, stored).catch(() => {});
      if (ctx) ctx.waitUntil(put);
    }
    if (session.cookie) result.headers.append("Set-Cookie", session.cookie);
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  },
};
export default worker;
