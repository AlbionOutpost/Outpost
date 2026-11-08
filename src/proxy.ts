import { NextRequest, NextResponse } from "next/server";
import { adsActive } from "@/components/adsense-loader";
import { legalPublished } from "@/lib/legal";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  // Google's ad and consent origins, only while ads are active; scripts still need the nonce.
  const ads = adsActive();
  const google =
    " https://*.googlesyndication.com https://*.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com https://*.adtrafficquality.google";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    `frame-src https://challenges.cloudflare.com${ads ? google : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://render.albiononline.com https://cdn.discordapp.com${ads ? " https:" : ""}`,
    `font-src 'self'${ads ? " https://fonts.gstatic.com" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src 'self' https://challenges.cloudflare.com${ads ? `${google} https://csi.gstatic.com` : ""}${dev ? " ws: wss:" : ""}`,
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-outpost-path", request.nextUrl.pathname);
  headers.set("Content-Security-Policy", policy);
  // The shell renders on the server with the region the URL asks for (it no longer reads the
  // query string itself, which forced the whole page to wait for JavaScript).
  headers.delete("x-outpost-region");
  const asked = request.nextUrl.searchParams.get("region");
  if (asked && /^(europe|americas|asia)$/.test(asked)) headers.set("x-outpost-region", asked);
  // While the legal page is unpublished it answers a real 404 (the page's own notFound() can only
  // show the 404 page after the status is sent).
  const response =
    !legalPublished && request.nextUrl.pathname === "/legal"
      ? NextResponse.rewrite(new URL("/_unpublished/legal", request.url), { request: { headers } })
      : NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  if (process.env.NEXTAUTH_URL?.startsWith("https://"))
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  if (request.nextUrl.pathname.startsWith("/invitations/"))
    response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
