// Writes public/sitemap.xml at build time: hubs, every tool, guides and the archived library
// (builds and comps). A static file costs no Worker request per crawl. Editor, account and API
// routes stay out (see src/app/robots.ts); item pages are left to natural crawling.
import { readFileSync, writeFileSync } from "node:fs";
import { tools } from "../src/lib/tool-directory";
import { publicOrigin } from "../src/lib/seo";
import { activityBackgrounds } from "../src/lib/activity-backgrounds";
const base = publicOrigin();
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(`public/library/grind-${name}.json`, "utf8"));
type Entry = { path: string; lastModified?: string; changeFrequency: string; priority: number };
const entries: Entry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/tools", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/market", changeFrequency: "daily", priority: 0.9 },
  { path: "/builds/activities", changeFrequency: "weekly", priority: 0.9 },
  { path: "/builds", changeFrequency: "daily", priority: 0.9 },
  { path: "/compositions/activities", changeFrequency: "weekly", priority: 0.8 },
  { path: "/compositions", changeFrequency: "daily", priority: 0.8 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.8 },
  { path: "/items", changeFrequency: "weekly", priority: 0.7 },
  { path: "/market-data", changeFrequency: "monthly", priority: 0.5 },
  ...tools
    .filter(
      (tool) =>
        tool.href.startsWith("/tools/") &&
        !["/tools/market", "/tools/death-feed"].includes(tool.href),
    )
    .map((tool) => ({ path: tool.href, changeFrequency: "weekly", priority: 0.8 })),
  ...activityBackgrounds.map((activity) => ({
    path: `/builds?source=library&category=${encodeURIComponent(activity.id)}`,
    changeFrequency: "weekly",
    priority: 0.6,
  })),
  ...read<{ slug: string; updatedAt: string }[]>("guides").map((guide) => ({
    path: `/guides/${encodeURIComponent(guide.slug)}`,
    lastModified: guide.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  })),
  ...read<{ slug: string; updatedAt: string }[]>("builds").map((build) => ({
    path: `/builds/library/${encodeURIComponent(build.slug)}`,
    lastModified: build.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  })),
  ...read<{ slug: string; updatedAt: string }[]>("compositions").map((comp) => ({
    path: `/compositions/library/${encodeURIComponent(comp.slug)}`,
    lastModified: comp.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  })),
];
const seen = new Set<string>();
const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const date = (value?: string) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time)
    ? `<lastmod>${new Date(time).toISOString().slice(0, 10)}</lastmod>`
    : "";
};
const body = entries
  .filter((entry) => !seen.has(entry.path) && seen.add(entry.path))
  .map(
    (entry) =>
      `<url><loc>${escape(base + entry.path)}</loc>${date(entry.lastModified)}<changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority></url>`,
  )
  .join("\n");
writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
);
console.log(`Wrote public/sitemap.xml with ${seen.size} URLs for ${base}.`);
