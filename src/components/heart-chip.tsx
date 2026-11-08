"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { ReactionFeedback } from "./reaction-feedback";
import { isFavorite, useLibraryFavorites } from "@/components/build-device-collections";
import type { SavedLibraryBuild } from "@/lib/build-device-collections";

/**
 * The library's recorded upvotes, with a heart. For a build the heart saves it to your
 * favourites (the same list as the library's save button: on the account when signed in, on
 * this device for guests) with a short burst; the
 * count is the archive's and never changes on click. A comp has no device list yet, so its
 * heart only shows the count.
 */
export function HeartChip({
  count,
  build,
  text,
  className = "",
}: {
  /** The archive's recorded upvotes; left out when the archive has none for this entry. */
  count?: number;
  build?: SavedLibraryBuild;
  /** Shown in the pill when there is no count, e.g. "Saved" on device favourites. */
  text?: string;
  /** Extra hook classes, e.g. the library's `library-device-save`. */
  className?: string;
}) {
  const favorites = useLibraryFavorites();
  const [burst, setBurst] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = !!build && isFavorite(favorites, build);
  const where = favorites.where === "account" ? "your" : "this device's";
  const label = count == null ? "Upvotes not recorded" : `${count.toLocaleString("en-US")} upvotes`;
  const shown = count == null ? (text ?? null) : count.toLocaleString("en-US");
  if (!build)
    return (
      <span className="heart-chip" aria-label={label}>
        <span className="heart-chip-icon">
          <Heart size={13} aria-hidden="true" />
        </span>
        {shown}
      </span>
    );
  return (
    <>
      <button
        type="button"
        className={`heart-chip is-button${saved ? " is-on" : ""}${className ? ` ${className}` : ""}`}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} ${build.title} ${saved ? "from" : "to"} ${where} favourites${count == null ? (text ? ` · ${text}` : "") : ` · ${label}`}`}
        title={
          favorites.where === "account"
            ? saved
              ? "Saved to your favourites"
              : "Save to your favourites"
            : saved
              ? "Saved on this device"
              : "Save on this device"
        }
        disabled={busy || favorites.loading || !!favorites.error}
        onClick={async () => {
          setBusy(true);
          try {
            setNote(await favorites.toggle(build));
            setBurst((b) => b + 1);
          } catch (e) {
            setNote(e instanceof Error ? e.message : "Could not save this favourite.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ReactionFeedback sequence={burst} active={saved} className="heart-chip-icon">
          <Heart size={13} />
        </ReactionFeedback>
        {shown}
      </button>
      <span className="sr-only" role="status">
        {note}
      </span>
    </>
  );
}
