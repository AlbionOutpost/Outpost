"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useDeviceBookmarks } from "@/components/build-device-collections";
import { bookmarksSchema, type SavedLibraryBuild } from "@/lib/build-device-collections";

/**
 * The library's recorded upvotes, with a heart. For a build the heart saves it to this
 * device's favourites (the same list as the library's save button) with a short burst; the
 * count is the archive's and never changes on click. A comp has no device list yet, so its
 * heart only shows the count.
 */
export function HeartChip({ count, build }: { count: number; build?: SavedLibraryBuild }) {
  const store = useDeviceBookmarks();
  const [burst, setBurst] = useState(0);
  const [note, setNote] = useState("");
  const saved = !!build && store.bookmarks.builds.some((b) => b.id === build.id);
  const label = `${count.toLocaleString("en-US")} upvotes`;
  if (!build)
    return (
      <span className="heart-chip" aria-label={label}>
        <span className="heart-chip-icon">
          <Heart size={13} aria-hidden="true" />
        </span>
        {count.toLocaleString("en-US")}
      </span>
    );
  return (
    <>
      <button
        type="button"
        className={`heart-chip is-button${saved ? " is-on" : ""}`}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} ${build.title} ${saved ? "from" : "to"} this device's favourites · ${label}`}
        title={saved ? "Saved on this device" : "Save on this device"}
        onClick={() => {
          try {
            if (!saved && store.bookmarks.builds.length >= 100)
              throw Error("You can save up to 100 library builds on this device.");
            store.write(
              store.key,
              bookmarksSchema.parse({
                ...store.bookmarks,
                builds: saved
                  ? store.bookmarks.builds.filter((b) => b.id !== build.id)
                  : [build, ...store.bookmarks.builds],
              }),
            );
            if (!saved) setBurst((b) => b + 1);
            setNote(saved ? "Removed from device favourites." : "Saved on this device.");
          } catch (e) {
            setNote(e instanceof Error ? e.message : "Could not save on this device.");
          }
        }}
      >
        <span className="heart-chip-icon">
          <Heart size={13} aria-hidden="true" />
          {burst > 0 && (
            <span key={burst} className="heart-chip-burst" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </span>
          )}
        </span>
        {count.toLocaleString("en-US")}
      </button>
      <span className="sr-only" role="status">
        {note}
      </span>
    </>
  );
}
