import { contentTypes } from "./builds/validation";
import { activityName } from "./grind-library-types";

/**
 * The Builds and Comps lists show player-made rows and archived library rows on one page.
 * Player rows use Outpost's content types ("Solo Mists"); library rows use the archive's
 * activity ids ("MISTS_SOLO"). One activity filter covers both: a library id where the
 * archive has one, else the content type. Only activities that are truly the same are paired,
 * so a filter never pulls in rows from a different activity.
 */
type ContentType = (typeof contentTypes)[number];
const sameActivity: Record<string, ContentType> = {
  ZVZ: "ZvZ",
  MISTS_SOLO: "Solo Mists",
  MISTS_DUO: "Duo Mists",
  FAME_FARM_SOLO: "Solo PvE",
  FAME_FARM_GROUP: "Group PvE",
  FAME_FARM_GROUP_AVALON: "Avalonian Dungeons",
  CORRUPTED_DUNGEON: "Corrupted Dungeons",
  OPEN_WORLD: "Open World",
  SMALL_SCALE: "Small Scale PvP",
  CRYSTAL_ARENA: "Crystal Arena",
  GATHERING: "Gathering",
};
const paired = new Set<string>(Object.values(sameActivity));
const isContentType = (value: string): value is ContentType =>
  (contentTypes as readonly string[]).includes(value);

export type Source = "" | "player" | "library";

/** The player content type an activity filter matches, or null when no player row can. */
export function playerContent(activity: string): ContentType | null {
  return sameActivity[activity] ?? (isContentType(activity) ? activity : null);
}
/** The library activity id an activity filter matches, or null when no library row can. */
export function libraryActivity(activity: string): string | null {
  if (!isContentType(activity)) return activity;
  return Object.entries(sameActivity).find(([, content]) => content === activity)?.[0] ?? null;
}
/** The activity filter for a player content type (`/builds?content=` links from before the merge). */
export function activityForContent(content: string) {
  return Object.entries(sameActivity).find(([, type]) => type === content)?.[0] ?? content;
}
/** The activity choices for a source: library activities, player content types, or both. */
export function activityOptions(source: Source, categories: readonly string[]) {
  const library = categories.map((id) => ({ value: id, label: activityName(id) }));
  const player = contentTypes
    .filter((type) => source === "player" || !paired.has(type))
    .map((type) => ({ value: activityForContent(type), label: type }));
  const options =
    source === "library" ? library : source === "player" ? player : [...library, ...player];
  return options.sort((a, b) => a.label.localeCompare(b.label));
}
/** The label of an activity filter value, whichever list it came from. */
export const activityLabel = (activity: string) =>
  isContentType(activity) ? activity : activityName(activity);

/**
 * Page `requested` of the player rows followed by the library rows, `size` to a page: how many
 * player rows it shows (from the player list's own page of the same number) and where in the
 * library list its library rows start.
 */
export function splitPage(requested: number, playerTotal: number, libraryTotal: number, size = 24) {
  const pages = Math.max(1, Math.ceil((playerTotal + libraryTotal) / size));
  const page = Math.min(Math.max(1, requested), pages);
  const start = (page - 1) * size;
  const playerTake = Math.max(0, Math.min(size, playerTotal - start));
  return {
    page,
    pages,
    playerTake,
    libraryStart: Math.max(0, start - playerTotal),
    libraryTake: size - playerTake,
  };
}

/** Rows [start, start + take) of a list that is served `size` rows to a page. */
export async function sliceOfPages<T>(
  load: (page: number) => { rows: T[]; page: number } | Promise<{ rows: T[]; page: number }>,
  start: number,
  take: number,
  size: number,
  loaded?: { rows: T[]; page: number },
): Promise<T[]> {
  if (take <= 0) return [];
  const first = Math.floor(start / size) + 1,
    last = Math.floor((start + take - 1) / size) + 1;
  const pages = await Promise.all(
    Array.from({ length: last - first + 1 }, (_, i) => first + i).map((n) =>
      loaded?.page === n ? loaded : load(n),
    ),
  );
  // A page past the end comes back as the last page; it holds none of the rows asked for.
  const rows = pages.flatMap((result, i) => (result.page === first + i ? result.rows : []));
  return rows.slice(start - (first - 1) * size, start - (first - 1) * size + take);
}
