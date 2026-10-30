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
    return app.fetch(request, this.env, this.ctx);
  }
  // Objects created before this change may still hold a scheduled cleanup.
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
const worker = {
  async fetch(request: Request, env: OutpostWebEnv) {
    const url = new URL(request.url);
    if (url.hostname === "www.albionoutpost.com") {
      url.hostname = "albionoutpost.com";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 308);
    }
    const session = await identity(request, env.OUTPOST_RENDER_SESSION_SECRET);
    const response = await env.SESSIONS.getByName(session.id).fetch(request);
    const result = new Response(response.body, response);
    if (session.cookie) result.headers.append("Set-Cookie", session.cookie);
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  },
};
export default worker;
