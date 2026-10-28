import "server-only";
import { createLibraryBuildDraft } from "./grind-build-draft";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  LibraryBuild,
  LibraryComposition,
  LibraryGuide,
  AwakeningTrait,
} from "./grind-library-types";
import type { JournalEntry } from "./journal-progress";
import type { FishReference } from "./albion/fishing";
import { paginateLibrary, type LibraryQuery } from "./grind-library-query";

// Immutable PUBLIC snapshots only; no user/account state enters these process-local indexes.
let builds: LibraryBuild[] | undefined;
let compositions: LibraryComposition[] | undefined;
let guides: LibraryGuide[] | undefined;
let spells: Record<string, string> | undefined;
let journal: JournalEntry[] | undefined;
let fishing: FishReference[] | undefined;
let traits: AwakeningTrait[] | undefined;
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), "public/library", `grind-${name}.json`), "utf8"));
export const libraryBuilds = () => (builds ||= read<LibraryBuild[]>("builds"));
export const libraryCompositions = () =>
  (compositions ||= read<LibraryComposition[]>("compositions"));
export const libraryGuides = () => (guides ||= read<LibraryGuide[]>("guides"));
export const librarySpellNames = () => (spells ||= read<Record<string, string>>("spell-names"));
export const libraryJournal = () => (journal ||= read<JournalEntry[]>("journal"));
export const libraryFishing = () => (fishing ||= read<FishReference[]>("fishing"));
export const libraryTraits = () => (traits ||= read<AwakeningTrait[]>("traits"));
export const findLibraryBuild = (slugOrId: string) =>
  libraryBuilds().find((b) => b.slug === slugOrId || b.id === slugOrId);
export const findLibraryGuide = (slug: string) => libraryGuides().find((g) => g.slug === slug);
export const findLibraryComposition = (slug: string) =>
  libraryCompositions().find((c) => c.slug === slug);
export const findLibraryBuilds = (ids: string[]) =>
  libraryBuilds().filter((build) => ids.includes(build.id) || ids.includes(build.slug));
export const queryLibraryBuilds = (query: LibraryQuery) =>
  paginateLibrary(libraryBuilds(), query, 24);
export const queryLibraryCompositions = (query: LibraryQuery) =>
  paginateLibrary(libraryCompositions(), query, 18);

const featured = [
  "battleaxe-mist-build",
  "bloodmoon-staff-group-dungeon-solo-build",
  "carving-sword-mist-build",
  "blight-staff-group-dungeon-build",
  "great-hammer-zvz-build",
  "light-crossbow-solo-dungeon-build",
];
export function featuredLibraryBuilds() {
  const rows = libraryBuilds();
  const selected = featured.flatMap((slug) => {
    const row = rows.find((b) => b.slug === slug);
    return row ? [row] : [];
  });
  return [
    ...selected,
    ...rows.filter(
      (b) =>
        !selected.includes(b) &&
        !b.title.toLowerCase().includes("copy") &&
        b.description.length > 120,
    ),
  ].slice(0, 6);
}

export const libraryBuildDraft = (build: LibraryBuild) =>
  createLibraryBuildDraft(build, librarySpellNames());
