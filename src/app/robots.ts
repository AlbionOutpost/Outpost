import { publicOrigin } from "@/lib/seo";
import type { MetadataRoute } from "next";
// Crawlers were spending most of the daily request budget on "start from this template"
// editor links (one per archived build). Keep crawlers on the public, indexable pages.
export default function robots(): MetadataRoute.Robots {
  return {
    // Generated at build time by scripts/build-sitemap.ts into public/sitemap.xml.
    sitemap: `${publicOrigin()}/sitemap.xml`,
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/builds/new",
          "/compositions/new",
          "/builds/*/edit",
          "/compositions/*/edit",
          "/dashboard",
          "/settings",
          "/signin",
          "/invitations/",
          "/favorites",
          "/shopping-list",
          "/admin",
          "/timers",
          "/groups/new",
        ],
      },
    ],
  };
}
