import { getCloudflareContext } from "@opennextjs/cloudflare";
import { publicLibraryFind, publicLibraryPage } from "./public-assets";
import { cache } from "react";
import { databaseBinding } from "./web-driver";
import { createLibraryBuildDraft } from "../../src/lib/grind-build-draft";
import type {
  LibraryBuild,
  LibraryComposition,
  LibraryGuide,
  AwakeningTrait,
} from "../../src/lib/grind-library-types";
import type { JournalEntry } from "../../src/lib/journal-progress";
import type { FishReference } from "../../src/lib/albion/fishing";
import type { LibraryQuery, LibraryPage } from "../../src/lib/grind-library-query";
import type { Activity } from "../../src/lib/library-activities";

// React cache deduplicates within a render/request, without retaining request-bound I/O globally.
const read = cache(async <T>(name: string): Promise<T> => {
  const binding = getCloudflareContext().env.ASSETS;
  if (!binding) throw new Error("Static assets binding missing");
  const response = await binding.fetch(
    new Request(`https://outpost-assets.invalid/library/grind-${name}.json`),
  );
  if (!response.ok) throw new Error("Public archive asset unavailable");
  const text = await response.text();
  if (text.length > 500_000) throw new Error("Unexpected archive asset size");
  return JSON.parse(text);
});
export const libraryGuides = () => read<LibraryGuide[]>("guides");
export const librarySpellNames = () => read<Record<string, string>>("spell-names");
/** Written at build time by scripts/build-library-activities.ts. */
export const libraryActivities = () => read<Activity[]>("activities");
export const libraryJournal = () => read<JournalEntry[]>("journal");
export const libraryFishing = () => read<FishReference[]>("fishing");
export const libraryTraits = () => read<AwakeningTrait[]>("traits");
export const findLibraryGuide = async (slug: string) =>
  (await libraryGuides()).find((guide) => guide.slug === slug);
export const findLibraryBuilds = async (keys: string[]) =>
  (await databaseBinding()
    .archiveFind("builds", keys)
    .catch(() => publicLibraryFind("builds", keys))) as LibraryBuild[];
export const findLibraryBuild = cache(async (key: string) => (await findLibraryBuilds([key]))[0]);
export const findLibraryComposition = async (key: string) =>
  (
    await databaseBinding()
      .archiveFind("compositions", [key])
      .catch(() => publicLibraryFind("compositions", [key]))
  )[0] as LibraryComposition | undefined;
export const queryLibraryBuilds = async (input: LibraryQuery) =>
  (await databaseBinding()
    .archiveList("builds", input)
    .catch(() => publicLibraryPage("builds", input))) as LibraryPage<LibraryBuild>;
export const queryLibraryCompositions = async (input: LibraryQuery) =>
  (await databaseBinding()
    .archiveList("compositions", input)
    .catch(() => publicLibraryPage("compositions", input))) as LibraryPage<LibraryComposition>;
/** Totals for the landing page: the archive manifest answers each count with one row. */
export const libraryCounts = async () => ({
  builds: (await queryLibraryBuilds({ page: 1 })).total,
  compositions: (await queryLibraryCompositions({ page: 1 })).total,
  guides: (await libraryGuides()).length,
});
const featured = [
  "battleaxe-mist-build",
  "bloodmoon-staff-group-dungeon-solo-build",
  "carving-sword-mist-build",
  "blight-staff-group-dungeon-build",
  "great-hammer-zvz-build",
  "light-crossbow-solo-dungeon-build",
];
/** The curated picks, filled from the newest library builds when a pick is missing. */
export const featuredLibraryBuilds = async () => {
  const rows = await findLibraryBuilds(featured);
  const picks = featured.flatMap((slug) => {
    const row = rows.find((build) => build.slug === slug);
    return row ? [row] : [];
  });
  if (picks.length >= 6) return picks.slice(0, 6);
  const fill = (await queryLibraryBuilds({ page: 1 })).rows.filter(
    (build) =>
      !picks.some((pick) => pick.id === build.id) &&
      !build.title.toLowerCase().includes("copy") &&
      build.description.length > 120,
  );
  return [...picks, ...fill].slice(0, 6);
};
export const libraryBuildDraft = async (build: LibraryBuild) =>
  createLibraryBuildDraft(build, await librarySpellNames());
