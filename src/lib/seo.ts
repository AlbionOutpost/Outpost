import type { Metadata } from "next";
import { activityBackgrounds } from "./activity-backgrounds";

export type SeoQuery = Record<string, string | string[] | undefined>;
export type SeoPageProps = { searchParams: Promise<SeoQuery> };
export const defaultDescription =
  "Independent Albion Online market prices, crafting and refining calculators, equipment builds and party planning for Europe, Americas and Asia.";
export const socialImagePath = "/brand/outpost-social.png";

/** Canonicals use the operator's public HTTPS origin, never the request Host or session. */
export function publicOrigin() {
  try {
    const url = new URL(process.env.OUTPOST_PUBLIC_URL || "https://albionoutpost.com");
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      return url.origin;
  } catch {
    /* Invalid local configuration must not become a public canonical. */
  }
  return "https://albionoutpost.com";
}

export function seoText(value: string, limit = 190) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
const scalar = (query: SeoQuery, name: string) =>
  typeof query[name] === "string" ? (query[name] as string) : "";

/** Only explicit, bounded public identity enters metadata. Search/account inputs stay out. */
export function canonicalUrl(path: string, query: SeoQuery = {}) {
  if (!path.startsWith("/") || path.startsWith("//") || /[?#\\\u0000-\u0020\u007f]/.test(path))
    throw new Error("Canonical paths must be local route paths without query or fragment");
  const origin = publicOrigin();
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Canonical origin must remain the public site");
  const region = scalar(query, "region");
  if (["europe", "americas", "asia"].includes(region)) url.searchParams.set("region", region);
  if (path === "/tools/market") {
    const item = scalar(query, "item"),
      quality = scalar(query, "quality");
    if (/^[A-Z0-9_@.-]{1,150}$/.test(item)) url.searchParams.set("item", item);
    if (/^[1-5]$/.test(quality)) url.searchParams.set("quality", quality);
  }
  if (["/builds/library", "/compositions/library"].includes(path)) {
    const category = scalar(query, "category");
    if (activityBackgrounds.some((activity) => activity.id === category))
      url.searchParams.set("category", category);
    for (const key of ["weapon", "family", "tag"]) {
      const value = scalar(query, key);
      if (/^[\p{L}\p{N} _'’+-]{1,80}$/u.test(value)) url.searchParams.set(key, value);
    }
  }
  if (
    [
      "/guides",
      "/items",
      "/builds",
      "/compositions",
      "/builds/library",
      "/compositions/library",
    ].includes(path)
  ) {
    const page = scalar(query, "page");
    if (/^[1-9]\d{0,3}$/.test(page) && Number(page) > 1) url.searchParams.set("page", page);
  }
  if (path === "/tools/kill-feed" && scalar(query, "view") === "deaths")
    url.searchParams.set("view", "deaths");
  return url.href;
}

export const privateRobots = {
  index: false,
  follow: false,
  nosnippet: true,
  noimageindex: true,
} as const;
export function privateMetadata(title = "Outpost workspace"): Metadata {
  const description =
    "An Outpost workspace. Private, unlisted and Team content is not included in search or share previews.";
  return {
    title,
    description,
    robots: privateRobots,
    alternates: { canonical: null },
    openGraph: {
      title: `${title} | Outpost`,
      description,
      type: "website",
      siteName: "Outpost",
      images: socialImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Outpost`,
      description,
      images: [new URL(socialImagePath, publicOrigin()).href],
    },
  };
}
function socialImages() {
  return [
    {
      url: new URL(socialImagePath, publicOrigin()).href,
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "Outpost — independent Albion Online tools, builds and calculators",
    },
  ];
}
export function publicMetadata(
  title: string,
  description: string,
  path: string,
  query: SeoQuery = {},
  article = false,
): Metadata {
  const name = seoText(title, 150),
    summary = seoText(description),
    url = canonicalUrl(path, query);
  // Personal lists and open-ended search results are useful UI, not search-index targets.
  const restricted =
    scalar(query, "mine") === "1" ||
    scalar(query, "view") === "saved" ||
    Boolean(scalar(query, "q"));
  return {
    title: name,
    description: summary,
    alternates: { canonical: url },
    robots: restricted
      ? privateRobots
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
    openGraph: {
      title: `${name} | Outpost`,
      description: summary,
      url,
      type: article ? "article" : "website",
      siteName: "Outpost",
      locale: "en_US",
      images: socialImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | Outpost`,
      description: summary,
      images: [new URL(socialImagePath, publicOrigin()).href],
    },
  };
}

export const publicPages: Record<string, [string, string]> = {
  "/": ["Albion Online tools, builds & calculators", defaultDescription],
  "/tools": [
    "Albion Online tools & calculators",
    "Compare market orders, calculate crafting and refining costs, plan equipment and explore Outpost's Albion Online tools.",
  ],
  "/tools/market": [
    "Albion Online market prices",
    "Compare Albion Online buy and sell orders across cities, inspect price history and check observation freshness in your selected region.",
  ],
  "/tools/crafting": [
    "Albion Online crafting calculator",
    "Calculate crafting materials, returns, fees, focus and profit from sourced recipes and available Albion Online market observations.",
  ],
  "/tools/refining": [
    "Albion Online refining calculator",
    "Compare refining materials, resource returns, focus costs and estimated silver profit using available city prices.",
  ],
  "/tools/cooking": [
    "Albion Online cooking calculator",
    "Plan cooking recipes and compare ingredient costs, fees and estimated food crafting profit with available market observations.",
  ],
  "/tools/alchemy": [
    "Albion Online alchemy calculator",
    "Calculate potion ingredients, crafting costs, returns and estimated profit using available Albion Online market prices.",
  ],
  "/tools/flipping": [
    "Albion Online market flipping calculator",
    "Compare city order spreads and calculate trading fees and estimated margins before placing an Albion Online market order.",
  ],
  "/tools/transporting": [
    "Albion Online transport calculator",
    "Compare city prices, transport weight and trading costs to plan an Albion Online shopping or transport run.",
  ],
  "/tools/farming": [
    "Albion Online farming calculator",
    "Estimate crop and animal farming costs, returns and focus assumptions with available prices and explicit missing-data states.",
  ],
  "/tools/fishing": [
    "Albion Online fishing calculator",
    "Explore fish references and calculate fishing-related costs and returns from the available sourced data.",
  ],
  "/tools/laborers": [
    "Albion Online laborer calculator",
    "Compare journals, laborer returns and estimated costs with available market prices and documented assumptions.",
  ],
  "/tools/mastery": [
    "Albion Online specialization & focus",
    "Explore equipment specialization and focus planning with Outpost's sourced Albion Online reference tools.",
  ],
  "/tools/gold": [
    "Albion Online gold price history",
    "Inspect observed gold price history for Albion Online regions and understand when each observation was collected.",
  ],
  "/tools/enchanting": [
    "Albion Online enchanting calculator",
    "Compare enchantment material requirements and available market prices before upgrading equipment.",
  ],
  "/tools/kill-feed": [
    "Albion Online kill & death feed",
    "Browse public Albion Online combat events, inspect equipment and filter kills or deaths in your selected region.",
  ],
  "/tools/avalon-mapper": [
    "Albion Online Roads of Avalon mapper",
    "Plan and record Roads of Avalon connections in an Outpost mapping workspace. Routes are entered by players.",
  ],
  "/tools/reference": [
    "Albion Online reference tables",
    "Browse Outpost's sourced Albion Online reference tables for equipment, production and planning.",
  ],
  "/builds": [
    "Albion Online community builds",
    "Browse public player-created Albion Online equipment builds and open loadouts to inspect gear, abilities and notes.",
  ],
  "/builds/activities": [
    "Albion Online builds by activity",
    "Find Albion Online builds for Solo Mists, Hellgates, Avalonian Dungeons, small scale and other activities.",
  ],
  "/builds/library": [
    "Albion Online build library",
    "Browse the archived Albion Online build library by activity and weapon, inspect equipment and adapt a loadout.",
  ],
  "/compositions": [
    "Albion Online team compositions",
    "Browse public player-created Albion Online party compositions and inspect roles, equipment and planning notes.",
  ],
  "/compositions/library": [
    "Albion Online group build library",
    "Explore archived Albion Online group builds and party compositions, with member loadouts, roles and equipment.",
  ],
  "/guides": [
    "Albion Online player guides",
    "Read Albion Online guides about progression, gathering, PvE and making silver, with source attribution and update dates.",
  ],
  "/items": [
    "Albion Online item database",
    "Search the available Albion Online item catalog, inspect sourced equipment metadata and compare regional market observations.",
  ],
  "/market-data": [
    "Albion Online market data & coverage",
    "Understand player-observed market prices, freshness, missing city data and contributing with the Albion Online Data Project client.",
  ],
  "/supporter": [
    "Support Outpost",
    "Learn about Outpost Supporter, ad-free tools and Team workspaces. Compare the available plan and account features.",
  ],
};

export function metadataForPage(path: string, query: SeoQuery = {}) {
  const page = publicPages[path];
  if (!page) throw new Error(`No reviewed public metadata for ${path}`);
  const category = activityBackgrounds.find(
    (activity) => activity.id === scalar(query, "category"),
  );
  const title =
    category && path === "/builds/library" ? `${category.name} builds — Albion Online` : page[0];
  const metadata = publicMetadata(title, page[1], path, query);
  if (path === "/")
    metadata.title = { absolute: "Outpost | Albion Online tools, builds & calculators" };
  return metadata;
}

export function rootMetadata(): Metadata {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  return {
    metadataBase: new URL(publicOrigin()),
    title: { default: "Outpost | Albion Online tools & builds", template: "%s | Outpost" },
    description: defaultDescription,
    applicationName: "Outpost",
    openGraph: {
      title: "Outpost | Albion Online tools & builds",
      description: defaultDescription,
      type: "website",
      siteName: "Outpost",
      locale: "en_US",
      images: socialImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: "Outpost | Albion Online tools & builds",
      description: defaultDescription,
      images: [new URL(socialImagePath, publicOrigin()).href],
    },
    ...(google || bing
      ? {
          verification: {
            ...(google ? { google } : {}),
            ...(bing ? { other: { "msvalidate.01": bing } } : {}),
          },
        }
      : {}),
  };
}
