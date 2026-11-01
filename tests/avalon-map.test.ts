import { expect, it } from "vitest";
import {
  emptyAvalonMap,
  findRoute,
  upsertLink,
  avalonLocations,
  roadZones,
} from "../src/lib/albion/avalon-map";
const now = Date.parse("2026-10-30T00:00:00Z");
it("ships the location and Roads zone lists", () => {
  expect(avalonLocations.length).toBe(857);
  expect(roadZones.size).toBe(317); // 322 records, five names listed twice
  expect(avalonLocations).toContain("Lymhurst");
});
it("replaces a portal between the same zones and routes over open links only", () => {
  const [z1, z2, z3] = [...roadZones.keys()];
  let map = upsertLink(emptyAvalonMap, { a: "Lymhurst", b: z1, size: 20, minutes: 60 }, now);
  map = upsertLink(map, { a: z1, b: "Lymhurst", size: 7, minutes: 120 }, now);
  expect(map.links).toHaveLength(1);
  expect(map.links[0].size).toBe(7);
  map = upsertLink(map, { a: z1, b: z2, size: 20, minutes: 30 }, now);
  map = upsertLink(map, { a: z2, b: z3, size: 20, minutes: 10 }, now);
  expect(findRoute(map, "Lymhurst", z3, now)?.zones).toEqual(["Lymhurst", z1, z2, z3]);
  // After 20 minutes the last portal has closed.
  expect(findRoute(map, "Lymhurst", z3, now + 20 * 60000)).toBeNull();
  expect(() => upsertLink(map, { a: "Nowhere", b: z1, size: 7, minutes: 5 }, now)).toThrow();
  expect(() => upsertLink(map, { a: z1, b: z1, size: 7, minutes: 5 }, now)).toThrow();
});
