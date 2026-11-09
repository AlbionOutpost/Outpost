import { getCloudflareContext } from "@opennextjs/cloudflare";
import { publicLibraryCategoryCounts, publicLibraryFind, publicLibraryPage } from "./public-assets";
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
import type { Activity, ActivityWeapon } from "../../src/lib/library-activities";

// The archive JSON ships with each deploy and never changes under a running isolate, so each
// file is read and parsed once per isolate instead of once per request (the landing parsed all
// guides on every view). Only the parsed value is kept, never the request's I/O; a failed read is
// forgotten so the next request tries again.
const kept = new Map<string, unknown>();
const read = cache(async <T>(name: string): Promise<T> => {
  if (kept.has(name)) return kept.get(name) as T;
  const binding = getCloudflareContext().env.ASSETS;
  if (!binding) throw new Error("Static assets binding missing");
  const response = await binding.fetch(
    new Request(`https://outpost-assets.invalid/library/grind-${name}.json`),
  );
  if (!response.ok) throw new Error("Public archive asset unavailable");
  const text = await response.text();
  if (text.length > 500_000) throw new Error("Unexpected archive asset size");
  const value = JSON.parse(text) as T;
  kept.set(name, value);
  return value;
});
export const libraryGuides = () => read<LibraryGuide[]>("guides");
export const librarySpellNames = () => read<Record<string, string>>("spell-names");
/** Written at build time by scripts/build-library-activities.ts. */
export const libraryActivities = () => read<Activity[]>("activities");
/** Written at build time by scripts/build-library-activities.ts (Comps by activity's weapons). */
export const libraryCompositionWeapons = () =>
  read<Record<string, ActivityWeapon[]>>("comp-weapons");
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
/** Group Builds per library category (Comps by activity). */
export const libraryCompositionCounts = cache(() => publicLibraryCategoryCounts("compositions"));
/** Totals for the landing page: the archive manifest answers both counts in one small read. */
export const libraryCounts = cache(async () => {
  const [totals, guides] = await Promise.all([
    databaseBinding()
      .archiveTotals()
      .catch(async () => {
        // An older data worker without archiveTotals, or D1 unavailable: use the public index.
        const [builds, compositions] = await Promise.all([
          publicLibraryPage("builds", { page: 1 }),
          publicLibraryPage("compositions", { page: 1 }),
        ]);
        return { builds: builds.total, compositions: compositions.total };
      }),
    libraryGuides(),
  ]);
  return { builds: totals.builds, compositions: totals.compositions, guides: guides.length };
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
/** Validating a draft runs the full build schema (≈ 8 ms); an archived build gives the same answer
 * until it changes, so the last few hundred answers are kept per isolate. */
const drafts = new Map<string, ReturnType<typeof createLibraryBuildDraft>>();
export const libraryBuildDraft = async (build: LibraryBuild) => {
  const key = `${build.id}:${build.updatedAt}`;
  if (drafts.has(key)) return structuredClone(drafts.get(key)!);
  const draft = createLibraryBuildDraft(build, await librarySpellNames());
  if (drafts.size >= 256) drafts.delete(drafts.keys().next().value!);
  drafts.set(key, draft);
  return structuredClone(draft);
};
