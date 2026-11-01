import { z } from "zod";
import mapData from "./game/avalon-locations.json" with { type: "json" };
export type RoadZone = { name: string; tier: number; icons: { node: string; count?: number }[] };
export const avalonLocations = mapData.locations as string[];
export const roadZones = new Map((mapData.roads as RoadZone[]).map((z) => [z.name, z]));
const known = new Set([...avalonLocations, ...roadZones.keys()]);
export const allZones = [...known].sort((a, b) => a.localeCompare(b));
export const avalonLink = z.object({
  id: z.string().max(80),
  a: z.string().max(80),
  b: z.string().max(80),
  size: z.union([z.literal(7), z.literal(20)]),
  expiresAt: z.string().datetime(),
});
export const avalonMap = z.object({
  version: z.literal(1),
  home: z.string().max(80).nullable(),
  links: z.array(avalonLink).max(500),
});
export type AvalonLink = z.infer<typeof avalonLink>;
export type AvalonMap = z.infer<typeof avalonMap>;
export const emptyAvalonMap: AvalonMap = { version: 1, home: null, links: [] };
export const isKnownLocation = (name: string) => known.has(name);
const pairKey = (a: string, b: string) => [a, b].sort().join("\u0000");
/** Add or refresh a portal; the same two zones never hold two links. */
export function upsertLink(
  map: AvalonMap,
  input: { a: string; b: string; size: AvalonLink["size"]; minutes: number },
  now = Date.now(),
): AvalonMap {
  if (!isKnownLocation(input.a) || !isKnownLocation(input.b))
    throw Error("Choose zones from the list");
  if (input.a === input.b) throw Error("A portal connects two different zones");
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 48 * 60)
    throw Error("Enter between 1 minute and 48 hours remaining");
  const key = pairKey(input.a, input.b);
  const link: AvalonLink = {
    id: key,
    a: input.a,
    b: input.b,
    size: input.size,
    expiresAt: new Date(now + input.minutes * 60000).toISOString(),
  };
  return { ...map, links: [...map.links.filter((l) => pairKey(l.a, l.b) !== key), link] };
}
export const isOpen = (link: AvalonLink, now = Date.now()) => Date.parse(link.expiresAt) > now;
/** Fewest-portal route over open links; null when unreachable. */
export function findRoute(map: AvalonMap, from: string, to: string, now = Date.now()) {
  if (from === to) return { zones: [from], links: [] as AvalonLink[] };
  const open = map.links.filter((l) => isOpen(l, now));
  const previous = new Map<string, { zone: string; link: AvalonLink }>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const zone = queue.shift()!;
    for (const link of open) {
      const next = link.a === zone ? link.b : link.b === zone ? link.a : null;
      if (!next || seen.has(next)) continue;
      seen.add(next);
      previous.set(next, { zone, link });
      if (next === to) {
        const zones = [to];
        const links: AvalonLink[] = [];
        let at = to;
        while (at !== from) {
          const step = previous.get(at)!;
          links.unshift(step.link);
          zones.unshift(step.zone);
          at = step.zone;
        }
        return { zones, links };
      }
      queue.push(next);
    }
  }
  return null;
}
