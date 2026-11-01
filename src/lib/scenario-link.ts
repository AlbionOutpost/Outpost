import type { Region } from "./albion/region-config";

export const scenarioHashLimit = 65536;
export type ScenarioHashKey = "scenario" | "production-plan";

/** Return no link rather than copying a payload the restore path will reject. */
export function scenarioLink(
  currentUrl: string,
  configuration: { region: Region },
  hashKey: ScenarioHashKey,
): string | null {
  const hash = `#${hashKey}=${encodeURIComponent(JSON.stringify(configuration))}`;
  if (hash.length > scenarioHashLimit) return null;
  const url = new URL(currentUrl);
  url.searchParams.set("region", configuration.region);
  url.hash = hash;
  return url.href;
}
