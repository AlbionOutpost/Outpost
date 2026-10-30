import type { MetadataRoute } from "next";
import { libraryBuilds, libraryCompositions, libraryGuides } from "@/lib/grind-library";
import { tools } from "@/lib/tool-directory";
// Public, indexable pages only: the hubs, every tool, guides and the archived library. Editor,
// account and API routes stay out (see robots.ts); item pages are reachable from the database
// and market pages and are left to natural crawling to keep the daily request budget for players.
export const revalidate = 86400;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = new URL(process.env.NEXTAUTH_URL || "https://albionoutpost.com").origin;
  const url = (path: string) => `${base}${path}`;
  const statics: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/tools"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/tools/market"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/builds/library"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/builds"), changeFrequency: "daily", priority: 0.7 },
    { url: url("/compositions/library"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/compositions"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/guides"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/items"), changeFrequency: "weekly", priority: 0.7 },
    { url: url("/groups"), changeFrequency: "weekly", priority: 0.5 },
    { url: url("/market-data"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/legal"), changeFrequency: "yearly", priority: 0.2 },
    ...tools
      .filter((tool) => tool.href !== "/tools/market")
      .map((tool) => ({ url: url(tool.href), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
  const guides = (await libraryGuides()).map((guide) => ({
    url: url(`/guides/${encodeURIComponent(guide.slug)}`),
    lastModified: new Date(guide.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const builds = (await libraryBuilds()).map((build) => ({
    url: url(`/builds/library/${encodeURIComponent(build.slug)}`),
    lastModified: new Date(build.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  const comps = (await libraryCompositions()).map((comp) => ({
    url: url(`/compositions/library/${encodeURIComponent(comp.slug)}`),
    lastModified: new Date(comp.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  return [...new Map([...statics, ...guides, ...builds, ...comps].map((e) => [e.url, e])).values()];
}
