"use client";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { EmptyWell } from "./empty-well";
import { BuildWindow } from "./build-window";
import { HeartChip } from "./heart-chip";
import { SectionHeading } from "./section-heading";
import {
  Bookmark,
  BookmarkCheck,
  Trash2,
  SlidersHorizontal,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import { ReactionFeedback } from "./reaction-feedback";
import { useOutpostRegion } from "./region-context";
import Link from "./build-region-link";
import { ItemIcon } from "./item-icon";
import { activityName } from "@/lib/grind-library-types";
import {
  bookmarkCollection,
  filterCollection,
  bookmarksSchema,
  savedFiltersSchema,
  buildDeviceKey,
  savedFilterHref,
  type SavedLibraryBuild,
} from "@/lib/build-device-collections";
import { WellSelect } from "./well-select";
import { SearchInput } from "./field";
import { setAccountFavorite, useAccountSaves } from "./account-saves";
const event = "outpost:build-device-change";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(event, callback);
  };
}
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return "!unavailable";
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(event));
}
/**
 * Library build favorites: on the account when signed in (the server keeps them per account),
 * in this browser for guests. `toggle` resolves to a short confirmation or throws with a reason.
 */
export function useLibraryFavorites() {
  const device = useCollection("bookmarks"),
    account = useAccountSaves();
  if (account.userId) {
    const builds = account.data?.favorites ?? [],
      limit = account.data?.limit ?? 100;
    return {
      where: "account" as const,
      builds,
      limit,
      unavailable: account.data?.unavailable ?? 0,
      loading: account.status === "loading",
      error: account.status === "error" ? account.error : "",
      retry: account.retry,
      async toggle(build: SavedLibraryBuild) {
        const saved = builds.some((b) => b.slug === build.slug);
        if (!saved && builds.length >= limit)
          throw Error(`You can save up to ${limit} library builds. Remove one first.`);
        const now = await setAccountFavorite(build, !saved);
        return now ? "Saved to your account." : "Removed from your favorites.";
      },
    };
  }
  const { bookmarks, key, error } = device;
  return {
    where: "device" as const,
    builds: bookmarks.builds,
    limit: 100,
    unavailable: 0,
    loading: false,
    error,
    retry: () => undefined,
    async toggle(build: SavedLibraryBuild) {
      const saved = bookmarks.builds.some((b) => b.id === build.id);
      if (!saved && bookmarks.builds.length >= 100)
        throw Error("You can save up to 100 library builds on this device.");
      write(
        key,
        bookmarksSchema.parse({
          ...bookmarks,
          builds: saved
            ? bookmarks.builds.filter((b) => b.id !== build.id)
            : [build, ...bookmarks.builds],
        }),
      );
      return saved ? "Removed from device favorites." : "Saved on this device.";
    },
  };
}
/** Whether `build` is among the favorites (accounts key by slug, devices by id). */
export const isFavorite = (
  favorites: ReturnType<typeof useLibraryFavorites>,
  build: SavedLibraryBuild,
) =>
  favorites.builds.some((b) =>
    favorites.where === "account" ? b.slug === build.slug : b.id === build.id,
  );
function useCollection(kind: "bookmarks" | "filters") {
  const region = useOutpostRegion(),
    key = buildDeviceKey(kind, region),
    raw = useSyncExternalStore(
      subscribe,
      () => read(key),
      () => null,
    );
  const value = useMemo(() => {
    try {
      return {
        bookmarks: bookmarkCollection(kind === "bookmarks" ? raw : null, region),
        filters: filterCollection(kind === "filters" ? raw : null, region),
        error: "",
      };
    } catch {
      return {
        bookmarks: bookmarkCollection(null, region),
        filters: filterCollection(null, region),
        error: "Device data could not be read. Your stored data has been kept.",
      };
    }
  }, [kind, raw, region]);
  return { ...value, region, key };
}
export function LibrarySaveButton({
  build,
  showLabel = false,
}: {
  build: SavedLibraryBuild;
  showLabel?: boolean;
}) {
  const favorites = useLibraryFavorites(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(0);
  const saved = isFavorite(favorites, build),
    account = favorites.where === "account";
  const name = account
    ? saved
      ? "Saved"
      : "Save to favorites"
    : saved
      ? "Saved on device"
      : "Save on device";
  return (
    <span className="library-save-control">
      <button
        type="button"
        className="build-card-save library-device-save"
        aria-label={
          showLabel
            ? `${name}: ${build.title}. ${saved ? "Remove" : "Save"} this favorite`
            : `${saved ? "Unsave" : "Save"} ${build.title} ${account ? "to your favorites" : "on this device"}`
        }
        aria-pressed={saved}
        disabled={!!favorites.error || favorites.loading || busy}
        title={
          saved
            ? account
              ? "Remove from favorites"
              : "Remove device favorite"
            : account
              ? "Save to your favorites"
              : "Save on this device"
        }
        onClick={async () => {
          setBusy(true);
          try {
            setMessage(await favorites.toggle(build));
            setFeedback((n) => n + 1);
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not save this favorite.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ReactionFeedback sequence={feedback} active={saved}>
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </ReactionFeedback>
        {showLabel && <span>{name}</span>}
      </button>
      {(message || favorites.error) && (
        <span className="device-save-feedback" role="status">
          {message || favorites.error}
        </span>
      )}
    </span>
  );
}
/** A device favourite in the same build window as every other build. The browser keeps only a
 * summary, so the weapon stands where the board would be. */
function DeviceFavoriteCard({ build }: { build: SavedLibraryBuild }) {
  const titleId = useId();
  return (
    <BuildWindow
      className="device-favorite-card"
      titleId={titleId}
      href={`/builds/library/${encodeURIComponent(build.slug)}`}
      title={build.title}
      category={build.category}
      activity={activityName(build.category) || "Other"}
      weaponName={build.weaponName}
      weaponItemId={build.itemId || undefined}
      author={build.author}
      updatedAt={build.updatedAt}
      heart={<HeartChip build={build} text="Saved" className="library-device-save" />}
    >
      <div className="build-window-summary">
        <span aria-hidden="true">
          {build.itemId ? <ItemIcon id={build.itemId} size={72} /> : null}
        </span>
        <small className="detail-muted">Open the build for its full loadout</small>
      </div>
    </BuildWindow>
  );
}
/** Library builds saved in this browser. `heading` is the section's heading, from the page. */
export function DeviceLibraryFavorites() {
  const favorites = useLibraryFavorites(),
    { error, loading } = favorites,
    bookmarks = { builds: favorites.builds },
    account = favorites.where === "account";
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("saved");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [requestedPage, setPage] = useState(1);
  const matching = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const rows = bookmarks.builds.filter((build) =>
      `${build.title} ${build.author} ${build.weaponName} ${activityName(build.category)}`
        .toLocaleLowerCase()
        .includes(term),
    );
    return sort === "title" ? rows.sort((a, b) => a.title.localeCompare(b.title)) : rows;
  }, [bookmarks.builds, query, sort]);
  const pages = Math.max(1, Math.ceil(matching.length / 24));
  const page = Math.min(requestedPage, pages);
  const visible = matching.slice((page - 1) * 24, page * 24);
  return (
    <section
      className="device-library-favorites"
      aria-label={
        account ? "Library favorites on your account" : "Library favorites on this device"
      }
    >
      <SectionHeading
        title={
          <>
            Library <em>builds</em>
          </>
        }
        line={
          loading
            ? "Loading your account’s library builds…"
            : `${bookmarks.builds.length} of ${favorites.limit} saved ${account ? "to your account" : "in this browser"}${favorites.unavailable ? ` · ${favorites.unavailable} no longer in the library` : ""}${query.trim() ? ` · ${matching.length} match` : ""}`
        }
        link={{ href: "/builds?source=library", label: "Build library" }}
      />
      {!error && bookmarks.builds.length > 0 && (
        <div className="raised ecosystem-result-toolbar favorites-toolbar">
          <label className="ecosystem-search-label">
            <span className="sr-only">Search library favorites</span>
            <SearchInput
              type="search"
              value={query}
              maxLength={100}
              placeholder="Search saved titles, weapons or authors…"
              aria-label="Search library favorites"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="ecosystem-sort-label">
            Sort
            <WellSelect
              value={sort}
              aria-label="Sort library favorites"
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              <option value="saved">Recently saved</option>
              <option value="title">Title A–Z</option>
            </WellSelect>
          </label>
          <div
            className="segmented ecosystem-view-switch"
            role="group"
            aria-label="Library favorite display"
          >
            <button
              type="button"
              aria-label="Library favorites grid"
              aria-pressed={view === "grid"}
              aria-current={view === "grid" ? "true" : undefined}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              type="button"
              aria-label="Library favorites list"
              aria-pressed={view === "list"}
              aria-current={view === "list" ? "true" : undefined}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert">
          {error}{" "}
          {account && (
            <button type="button" className="button secondary" onClick={() => favorites.retry()}>
              Try again
            </button>
          )}
        </p>
      ) : loading ? (
        <p className="device-favorites-count" role="status">
          Loading your saved library builds…
        </p>
      ) : bookmarks.builds.length ? (
        <>
          {matching.length > 24 && (
            <p className="device-favorites-count" role="status">
              {(page - 1) * 24 + 1}–{Math.min(page * 24, matching.length)} of {matching.length}{" "}
              shown
            </p>
          )}
          {visible.length ? (
            <div className={`device-favorites-grid${view === "list" ? " is-list" : ""}`}>
              {visible.map((build) => (
                <DeviceFavoriteCard build={build} key={build.id} />
              ))}
            </div>
          ) : (
            <EmptyWell
              title="No favorites match your search"
              action={
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                >
                  Clear library search
                </button>
              }
            />
          )}
          {pages > 1 && (
            <nav className="device-favorites-pagination" aria-label="Library favorite pages">
              <button
                type="button"
                className="button secondary"
                aria-label="Previous library favorites"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                type="button"
                className="button secondary"
                aria-label="Next library favorites"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyWell
          emblem="strip-builds"
          title="No library builds saved yet"
          line={
            account
              ? "Use the heart on a library build to keep it here, on every device you sign in on. Up to 100 builds."
              : "Use the heart on a library build to keep it here. It stays in this browser, up to 100 builds."
          }
          action={
            <Link className="button secondary" href="/builds?source=library">
              Open the library
            </Link>
          }
        />
      )}
    </section>
  );
}
export function SaveBuildFilter({
  path,
  query,
}: {
  path: "/builds";
  query: Record<string, string>;
}) {
  const { filters, error, key } = useCollection("filters"),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  return (
    <details className="save-build-filter">
      <summary>
        <SlidersHorizontal size={14} />
        Save filters
      </summary>
      <div>
        <label>
          Filter name
          <input
            value={name}
            maxLength={40}
            placeholder="My Mists loadouts"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={!!error || !name.trim()}
          onClick={() => {
            try {
              if (filters.filters.length >= 8)
                throw Error("Keep up to 8 saved filters on this device.");
              write(
                key,
                savedFiltersSchema.parse({
                  ...filters,
                  filters: [
                    { id: crypto.randomUUID(), name: name.trim(), path, query },
                    ...filters.filters,
                  ],
                }),
              );
              setName("");
              setMessage("Filters saved on this device.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Could not save filters.");
            }
          }}
        >
          <Plus size={14} />
          Save on device
        </button>
        <p role="status">
          {error || message || "Saved filters stay in this browser and server selection."}
        </p>
      </div>
    </details>
  );
}
export function SavedBuildFilters() {
  const { filters, error, key, region } = useCollection("filters"),
    [message, setMessage] = useState("");
  return (
    <section className="saved-build-filters">
      <div className="ecosystem-section-heading">
        <div>
          <h2>Your saved filters</h2>
          <p>
            Saved on this device · {region} · {filters.filters.length}/8
          </p>
        </div>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : filters.filters.length ? (
        <div className="saved-filter-list">
          {filters.filters.map((filter) => (
            <article key={filter.id}>
              <SlidersHorizontal size={20} />
              <div>
                <h3>{filter.name}</h3>
                <p>
                  {Object.entries(filter.query)
                    .filter(([key, value]) => value && !["view", "mine"].includes(key))
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ") || "All builds"}
                </p>
              </div>
              <Link className="button secondary" href={savedFilterHref(filter, region)}>
                Apply filters
              </Link>
              <button
                className="icon-button"
                type="button"
                aria-label={`Delete saved filter ${filter.name}`}
                onClick={() => {
                  try {
                    write(key, {
                      ...filters,
                      filters: filters.filters.filter((f) => f.id !== filter.id),
                    });
                    setMessage("Saved filter removed.");
                  } catch {
                    setMessage("Could not remove the saved filter.");
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="ecosystem-empty">
          <SlidersHorizontal size={28} />
          <h3>A shortcut to your playstyle.</h3>
          <p>Choose a weapon, activity or tag, then save the filters above the results.</p>
          <Link className="button secondary" href="/builds">
            Find a build
          </Link>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
