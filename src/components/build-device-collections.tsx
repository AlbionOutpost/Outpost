"use client";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Trash2,
  SlidersHorizontal,
  Plus,
  Grid2X2,
  List,
} from "lucide-react";
import { useAtlasRegion } from "./region-context";
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
function useCollection(kind: "bookmarks" | "filters") {
  const region = useAtlasRegion(),
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
  const { bookmarks, error, key } = useCollection("bookmarks"),
    [message, setMessage] = useState("");
  const saved = bookmarks.builds.some((b) => b.id === build.id);
  return (
    <span className="library-save-control">
      <button
        type="button"
        className="build-card-save library-device-save"
        aria-label={
          showLabel
            ? `${saved ? "Saved on device" : "Save on device"}: ${build.title}. ${saved ? "Remove" : "Save"} this favorite`
            : `${saved ? "Unsave" : "Save"} ${build.title} on this device`
        }
        aria-pressed={saved}
        disabled={!!error}
        title={saved ? "Remove device favorite" : "Save on this device"}
        onClick={() => {
          try {
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
            setMessage(saved ? "Removed from device favorites." : "Saved on this device.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not save on this device.");
          }
        }}
      >
        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        {showLabel && <span>{saved ? "Saved on device" : "Save on device"}</span>}
      </button>
      {(message || error) && (
        <span className="device-save-feedback" role="status">
          {message || error}
        </span>
      )}
    </span>
  );
}
function DeviceFavoriteCard({ build }: { build: SavedLibraryBuild }) {
  const titleId = useId();
  return (
    <article className="device-favorite-card">
      <div className="device-favorite-content">
        {build.itemId ? <ItemIcon id={build.itemId} size={56} /> : <Bookmark size={36} />}
        <span>
          <small>{activityName(build.category)}</small>
          <Link
            href={`/builds/library/${encodeURIComponent(build.slug)}`}
            aria-labelledby={titleId}
            className="ecosystem-title-link"
          >
            <h3 id={titleId}>{build.title}</h3>
          </Link>
          <span>By {build.author}</span>
        </span>
      </div>
      <LibrarySaveButton build={build} />
    </article>
  );
}
export function DeviceLibraryFavorites({ compactEmpty = false }: { compactEmpty?: boolean }) {
  const { bookmarks, error } = useCollection("bookmarks");
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
    <section className="device-library-favorites" aria-label="Library favorites on this device">
      <div className="ecosystem-section-heading">
        <div>
          <h2>Library favorites</h2>
          <p>
            Saved on this device · {bookmarks.region} · {bookmarks.builds.length}/100
          </p>
        </div>
        <Link href="/builds/library" className="text-link">
          Browse builds →
        </Link>
      </div>
      {!error && bookmarks.builds.length > 0 && (
        <div className="device-favorites-controls">
          <label>
            Search library favorites
            <input
              type="search"
              value={query}
              maxLength={100}
              placeholder="Title, weapon or author"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Sort library favorites
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              <option value="saved">Recently saved</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
          <div className="actions" role="group" aria-label="Library favorite display">
            <button
              type="button"
              className="button secondary"
              aria-label="Library favorites grid"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Grid2X2 size={16} />
            </button>
            <button
              type="button"
              className="button secondary"
              aria-label="Library favorites list"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert">{error}</p>
      ) : bookmarks.builds.length ? (
        <>
          <p className="device-favorites-count" role="status">
            {matching.length} matching favorites · {matching.length ? (page - 1) * 24 + 1 : 0}–
            {Math.min(page * 24, matching.length)} shown
          </p>
          {visible.length ? (
            <div className={`device-favorites-grid${view === "list" ? " is-list" : ""}`}>
              {visible.map((build) => (
                <DeviceFavoriteCard build={build} key={build.id} />
              ))}
            </div>
          ) : (
            <div className="ecosystem-empty">
              <h3>No favorites match your search.</h3>
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
            </div>
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
      ) : compactEmpty ? (
        <p className="device-favorites-empty-note">
          No library favorites yet. Save a build from the library to keep it on this device.
        </p>
      ) : (
        <div className="ecosystem-empty">
          <Bookmark size={28} />
          <h3>Keep your next loadout close.</h3>
          <p>Save a build from the library. Your choices stay in this browser.</p>
          <Link className="button secondary" href="/builds/library">
            Explore the library
          </Link>
        </div>
      )}
    </section>
  );
}
export function SaveBuildFilter({
  path,
  query,
}: {
  path: "/builds" | "/builds/library";
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
          <Link className="button secondary" href="/builds/library">
            Find a build
          </Link>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
