import type { LibraryBuild } from "./grind-library-types";
import { activityName } from "./grind-library-types";

export type Activity = {
  category: string;
  name: string;
  builds: number;
  weapons: string[];
  top: { title: string; slug: string; upvotes: number } | null;
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
 * Per activity: how many public builds it has, the main-hand weapons of its best-liked builds
 * and the single most liked build. A pure summary of the recorded library; on Cloudflare it is
 * written at build time (`scripts/build-library-activities.ts`) because the full build list
 * is not loaded per request there.
 */
export function summariseActivities(rows: LibraryBuild[]): Activity[] {
  return landingActivities.map((category) => {
    const builds = rows
      .filter((b) => b.category === category)
      .toSorted((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    const weapons = [
      ...new Set(
        builds.flatMap((b) => {
          const id = b.equipment.find((e) => e.slot === "Main hand")?.itemId;
          return id ? [id] : [];
        }),
      ),
    ].slice(0, 3);
    const top = builds[0];
    return {
      category,
      name: activityName(category),
      builds: builds.length,
      weapons,
      top: top?.upvotes ? { title: top.title, slug: top.slug, upvotes: top.upvotes } : null,
    };
  });
}
