import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { NextResponse } from "next/server";
const handler = NextAuth(authOptions);
/** Cloudflare sets CF-Connecting-IP on every request; elsewhere fall back to one shared bucket. */
function clientKey(request: Request) {
  const ip =
    process.env.OUTPOST_RUNTIME === "cloudflare" && request.headers.get("cf-connecting-ip");
  return ip ? `oauth:${ip}` : "oauth:shared";
}
async function limited(...args: Parameters<typeof handler>) {
  const request = args[0] as Request;
  // Per-client budget first so one flooding address cannot lock everyone out of sign-in;
  // the site-wide budget stays as a far larger backstop.
  if (
    !(await rateLimit(clientKey(request), 40, 60)) ||
    !(await rateLimit("oauth-global", 2400, 60))
  )
    return NextResponse.json(
      { error: "Authentication request budget exceeded" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  return handler(...args);
}
export { limited as GET, limited as POST };
