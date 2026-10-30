import type { MetadataRoute } from "next";
// Crawlers were spending most of the daily request budget on "start from this template"
// editor links (one per archived build). Keep crawlers on the public, indexable pages.
export default function robots(): MetadataRoute.Robots {
  return {
    sitemap: `${new URL(process.env.NEXTAUTH_URL || "https://albionoutpost.com").origin}/sitemap.xml`,
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
        ],
      },
    ],
  };
}
