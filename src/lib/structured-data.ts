import { defaultDescription, publicOrigin, publicPages, socialImagePath } from "./seo";

type Json = Record<string, unknown>;
const abs = (path: string) => new URL(path, publicOrigin()).href;
const orgId = () => `${publicOrigin()}/#organization`;

/** Organization and WebSite, emitted once on the homepage. No SearchAction: no public search-results URL is indexable. */
export function siteGraph(): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId(),
        name: "Outpost",
        url: abs("/"),
        logo: abs("/icon-512.png"),
        image: abs(socialImagePath),
      },
      {
        "@type": "WebSite",
        "@id": `${publicOrigin()}/#website`,
        url: abs("/"),
        name: "Outpost",
        description: defaultDescription,
        inLanguage: "en",
        publisher: { "@id": orgId() },
      },
    ],
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbList(crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: abs(crumb.path),
    })),
  };
}

const shortName = (path: string) => {
  const name = publicPages[path]?.[0].replace(/^Albion Online /, "") ?? path;
  return name.charAt(0).toUpperCase() + name.slice(1);
};
const crumbNames: Record<string, string> = { "/tools": "Tools", "/builds": "Builds" };

/** Crumbs for a reviewed hub/tool route; null for the root, unknown paths and one-level pages. */
export function crumbsForPath(path: string): Crumb[] | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2 || !publicPages[path]) return null;
  const crumbs: Crumb[] = [{ name: "Home", path: "/" }];
  for (let i = 1; i <= parts.length; i++) {
    const p = `/${parts.slice(0, i).join("/")}`;
    crumbs.push({ name: crumbNames[p] ?? shortName(p), path: p });
  }
  return crumbs;
}

export function articleLd(input: {
  title: string;
  description: string;
  path: string;
  author: string;
  updatedAt?: string;
}): Json {
  const date =
    input.updatedAt && !Number.isNaN(Date.parse(input.updatedAt)) ? input.updatedAt : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title.slice(0, 110),
    description: input.description,
    mainEntityOfPage: abs(input.path),
    image: abs(socialImagePath),
    author: { "@type": "Person", name: input.author },
    publisher: { "@type": "Organization", "@id": orgId(), name: "Outpost" },
    ...(date ? { dateModified: date } : {}),
    inLanguage: "en",
  };
}

export function itemListLd(name: string, items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: abs(item.path),
      name: item.name,
    })),
  };
}
