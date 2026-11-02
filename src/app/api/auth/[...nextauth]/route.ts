import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { readBoundedBody } from "@/lib/request-body";
import { HttpError } from "@/lib/http-error";
const handler = NextAuth(authOptions);
/** Only Cloudflare's overwritten address header is trusted; Node keeps the larger backstop. */
function clientKey(request: Request) {
  const ip =
    process.env.OUTPOST_RUNTIME === "cloudflare" && request.headers.get("cf-connecting-ip");
  return ip ? `oauth:${ip}` : null;
}
async function limited(...args: Parameters<typeof handler>) {
  const request = args[0] as Request;
  const client = clientKey(request);
  // Per-client budget first so one flooding address cannot lock everyone out of sign-in;
  // the site-wide budget stays as a far larger backstop.
  if (
    (client && !(await rateLimit(client, 40, 60))) ||
    !(await rateLimit("oauth-global", 2400, 60))
  )
    return NextResponse.json(
      { error: "Authentication request budget exceeded" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  if (request.method === "POST") {
    try {
      const body = await readBoundedBody(request, 65536);
      args[0] = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body,
      });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }
  return handler(...args);
}
export { limited as GET, limited as POST };
