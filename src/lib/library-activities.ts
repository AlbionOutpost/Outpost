import type { LibraryBuild } from "./grind-library-types";
import { activityName } from "./grind-library-types";

export type ActivityBuild = { title: string; slug: string; upvotes: number; itemId: string | null };
export type Activity = {
  category: string;
  name: string;
  builds: number;
  /** The five most liked builds, most liked first (only builds someone liked). */
  top: ActivityBuild[];
};

/** The activities players ask for most, in the order the landing grid shows them. */
export const landingActivities = [
  "ZVZ",
  "SMALL_SCALE",
  "HELLGATE_5V5",
  "FAME_FARM_GROUP_AVALON",
  "FAME_FARM_GROUP",
  "CORRUPTED_DUNGEON",
  "MISTS_SOLO",
  "GANK_GROUP",
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
