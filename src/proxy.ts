import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  // Advertising origins are only allowed once the owner has configured an AdSense client;
  // an unconfigured deploy keeps the strict policy.
  const ads = /^ca-pub-\d{6,20}$/.test(process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "");
  const adScripts = ads
    ? " https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google"
    : "";
  const adFrames = ads
    ? " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://ep2.adtrafficquality.google https://www.google.com"
    : "";
  const adImages = ads
    ? " https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://*.googleusercontent.com"
    : "";
  const adConnect = ads
    ? " https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://csi.gstatic.com"
    : "";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${adScripts}${dev ? " 'unsafe-eval'" : ""}`,
    `frame-src https://challenges.cloudflare.com${adFrames}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://render.albiononline.com https://cdn.discordapp.com${adImages}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src 'self' https://challenges.cloudflare.com${adConnect}${dev ? " ws: wss:" : ""}`,
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
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
