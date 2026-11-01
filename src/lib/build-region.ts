import { regionSchema, type Region } from "./albion/region-config";
export function withBuildRegion(href: string, region: Region) {
  regionSchema.parse(region);
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://outpost.invalid");
  url.searchParams.set("region", region);
  return url.pathname + url.search + url.hash;
}
