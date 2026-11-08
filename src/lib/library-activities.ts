import type { LibraryBuild, LibraryComposition } from "./grind-library-types";
import { activityName } from "./grind-library-types";

export type ActivityBuild = { title: string; slug: string; upvotes: number; itemId: string | null };
export type Activity = {
  category: string;
  name: string;
  builds: number;
  /** The five most liked builds, most liked first (only builds someone liked). */
  top: ActivityBuild[];
};

/** Featured activities, in the order the landing grid shows them. */
export const landingActivities = [
  "CRYSTAL_CREATURES",
  "SMALL_SCALE",
  "HELLGATE_5V5",
  "FAME_FARM_GROUP_AVALON",
  "CORRUPTED_DUNGEON",
  "MISTS_SOLO",
] as const;

/**
 * Per activity: how many public builds it has and its five most liked builds with their
 * main-hand weapon. A pure summary of the recorded library; on Cloudflare it is
 * written at build time (`scripts/build-library-activities.ts`) because the full build list
 * is not loaded per request there.
 */
export function summariseActivities(rows: LibraryBuild[]): Activity[] {
  return landingActivities.map((category) => {
    // filter() already copies, so sorting in place leaves the library untouched
    const builds = rows
      .filter((b: LibraryBuild) => b.category === category)
      .sort((a: LibraryBuild, b: LibraryBuild) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    return {
      category,
      name: activityName(category),
      builds: builds.length,
      top: builds
        .filter((b: LibraryBuild) => (b.upvotes ?? 0) > 0)
        .slice(0, 5)
        .map((b: LibraryBuild) => ({
          title: b.title,
          slug: b.slug,
          upvotes: b.upvotes ?? 0,
          itemId: b.equipment.find((e) => e.slot === "Main hand")?.itemId || null,
        })),
    };
  });
}

export type ActivityWeapon = { itemId: string; name: string; count: number };
/**
 * Per Group Build category: the main-hand weapons its comps' members carry, most comps first
 * (each comp counts a weapon once), the top six. Comps by activity merges these with the player
 * comps' own main hands and overlays the top three. Written at build time for Cloudflare
 * (`scripts/build-library-activities.ts`), like the landing summary.
 */
export function summariseCompWeapons(
  comps: Pick<LibraryComposition, "category" | "members">[],
  builds: Pick<LibraryBuild, "id" | "weaponName" | "equipment">[],
): Record<string, ActivityWeapon[]> {
  const byId = new Map(builds.map((b) => [b.id, b]));
  const counts = new Map<string, Map<string, ActivityWeapon>>();
  for (const comp of comps) {
    const seen = new Set<string>();
    for (const id of comp.members) {
      const build = byId.get(id);
      const itemId = build?.equipment.find((e) => e.slot === "Main hand")?.itemId;
      if (!build || !itemId || seen.has(itemId)) continue;
      seen.add(itemId);
      const category = counts.get(comp.category) ?? new Map<string, ActivityWeapon>();
      counts.set(comp.category, category);
      const prior = category.get(itemId);
      category.set(itemId, {
        itemId,
        name: prior?.name ?? (build.weaponName || "Main-hand weapon"),
        count: (prior?.count ?? 0) + 1,
      });
    }
  }
  return Object.fromEntries(
    [...counts].map(([category, weapons]) => [category, rankWeapons([...weapons.values()], 6)]),
  );
}
/** Most comps first, then by name, so equal counts never reorder between builds. */
export const rankWeapons = (weapons: ActivityWeapon[], limit: number) =>
  [...weapons].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
