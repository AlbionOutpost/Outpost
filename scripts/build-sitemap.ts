// Writes public/sitemap.xml and public/robots.txt at build time: hubs, every tool, guides and the
// archived library (builds and comps). Static files cost no Worker request per crawl (robots.txt
// rendered by the app cost ≈ 270 ms of CPU per fetch). Editor, account and API routes stay out;
// item pages are left to natural crawling. The sitemap lists only indexable pages under their own
// canonical address; the checks at the end fail the build otherwise.
import { readFileSync, writeFileSync } from "node:fs";
import { tools } from "../src/lib/tool-directory";
import { canonicalUrl, publicOrigin } from "../src/lib/seo";
import { activityBackgrounds } from "../src/lib/activity-backgrounds";
import { indexedBuild, listedBuild } from "../src/lib/library-scope";
const base = publicOrigin();
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(`public/library/grind-${name}.json`, "utf8"));
type Entry = { path: string; lastModified?: string; changeFrequency: string; priority: number };
type Build = { slug: string; updatedAt: string; upvotes?: number; category?: string };
// Only builds a player liked are indexable (src/lib/library-scope.ts); the rest render noindex.
// An activity list shows listed builds only, and one with none of them is an empty page.
const allBuilds = read<Build[]>("builds");
const builds = allBuilds.filter(indexedBuild);
const activeCategories = new Set(allBuilds.filter(listedBuild).map((build) => build.category));
const entries: Entry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/tools", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/market", changeFrequency: "daily", priority: 0.9 },
  { path: "/builds/activities", changeFrequency: "weekly", priority: 0.9 },
  { path: "/builds", changeFrequency: "daily", priority: 0.9 },
  { path: "/compositions", changeFrequency: "weekly", priority: 0.8 },
  { path: "/compositions?view=all", changeFrequency: "daily", priority: 0.8 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.8 },
  { path: "/items", changeFrequency: "weekly", priority: 0.7 },
  { path: "/market-data", changeFrequency: "monthly", priority: 0.5 },
  { path: "/giveaways", changeFrequency: "daily", priority: 0.6 },
  // Impressum, privacy policy and terms (both languages on one address, hreflang by ?lang).
  { path: "/legal", changeFrequency: "monthly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.2 },
  ...tools
    .filter(
      (tool) =>
        tool.href.startsWith("/tools/") &&
        !["/tools/market", "/tools/death-feed"].includes(tool.href),
    )
    .map((tool) => ({ path: tool.href, changeFrequency: "weekly", priority: 0.8 })),
  ...activityBackgrounds
    .filter((activity) => activeCategories.has(activity.id))
    .map((activity) => ({
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
  ...builds.map((build) => ({
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

// Crawl rules. Crawlers made ≈ 90 % of the web Worker's requests and CPU on 9 Nov 2026, mostly
// on the build list's layout and search variants and on `?region=` copies of archived builds.
const disallow = [
  "/api/",
  "/builds/new",
  "/compositions/new",
  // `$` ends the match, so a library slug that starts with "edit" stays crawlable.
  "/builds/*/edit$",
  "/builds/*/edit?",
  "/compositions/*/edit$",
  "/compositions/*/edit?",
  "/dashboard",
  "/settings",
  "/signin",
  "/invitations/",
  "/favorites",
  "/shopping-list",
  "/admin",
  "/timers",
  "/groups/new",
  // Search results are noindex already (src/lib/seo.ts publicMetadata).
  "/*?q=",
  "/*&q=",
  // Grid or list is a layout switch over the same builds; the canonical drops it.
  "/builds?*view=",
  // An archived build or comp, or an item, is the same page under any query (the region only
  // seeds the client-side price check); the sitemap and links list the plain address.
  "/builds/library/*?",
  "/compositions/library/*?",
  "/items/*?",
];
// Nothing listed may be blocked by robots.txt, render noindex, redirect or name another canonical.
const blocked = disallow.map(
  (rule) =>
    new RegExp(
      `^${rule
        .replace(/[.+^${}()|[\]\\?]/g, "\\$&")
        .replaceAll("*", ".*")
        .replace(/\\\$$/, "$")}`,
    ),
);
const noindex =
  /^\/(api|admin|dashboard|settings|favorites|shopping-list|timers|signin|groups|invitations|players|premium|supporter)(\/|\?|$)|^\/tools\/death-feed|^\/(builds|compositions)\/library(\?|$)|[?&](q|mine|region)=|[?&]view=saved/;
for (const path of seen) {
  if (blocked.some((rule) => rule.test(path))) throw new Error(`robots.txt blocks ${path}`);
  if (noindex.test(path))
    throw new Error(`The sitemap lists a noindex or redirected page: ${path}`);
  const url = new URL(path, base);
  if (canonicalUrl(url.pathname, Object.fromEntries(url.searchParams)) !== url.href)
    throw new Error(`${path} names another canonical`);
}
writeFileSync(
  "public/robots.txt",
  [
    ["User-agent: *", "Allow: /", ...disallow.map((path) => `Disallow: ${path}`)].join("\n"),
    // Backlink and SEO index crawlers send no visitors and made half of all Worker CPU (9 Nov
    // 2026, ≈ 0.35 s per page). Search engines (Google, Bing, Apple, Amazon) are not affected.
    [
      ...["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot"].map((agent) => `User-agent: ${agent}`),
      "Disallow: /",
    ].join("\n"),
    `Sitemap: ${base}/sitemap.xml`,
  ].join("\n\n") + "\n",
);
console.log("Wrote public/robots.txt.");
