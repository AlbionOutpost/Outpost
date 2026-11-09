import { regionSchema, type Region } from "./albion/region-config";

/**
 * Links name the server only off Europe. Europe is what every page renders with no `?region=`
 * and no region cookie (the picker writes the cookie), so its links stay on the one canonical
 * address crawlers and the page cache see; `?region=europe` copies were crawled as duplicates
 * and, on archived builds and items, are blocked by robots.txt.
 */
export const regionSuffix = (region: Region) =>
  regionSchema.parse(region) === "europe" ? "" : `?region=${region}`;

export function withBuildRegion(href: string, region: Region) {
  regionSchema.parse(region);
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://outpost.invalid");
  if (region === "europe") url.searchParams.delete("region");
  else url.searchParams.set("region", region);
  return url.pathname + url.search + url.hash;
}
