"use client";
import { useId, useRef, useState } from "react";
import { Heart, Star } from "lucide-react";
import { ReactionFeedback } from "./reaction-feedback";
import Link from "@/components/build-region-link";

/**
 * A player build's account favourite. `heart` draws it as the window bar's ♥ chip with the
 * count, as on library and landing windows; the default is the older star button.
 */
export function FavoriteBuildButton({
  id,
  title,
  authenticated,
  initialSaved,
  initialCount,
  heart = false,
}: {
  id: string;
  title: string;
  authenticated: boolean;
  initialSaved: boolean;
  initialCount: number;
  heart?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved),
    [count, setCount] = useState(initialCount),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const messageId = useId();
  const pending = useRef(false);
  const [feedback, setFeedback] = useState(0);
  const Icon = heart ? Heart : Star;
  const size = heart ? 13 : 17;
  // The visible count is part of the heart's name, so speech and sight agree.
  const counted =
    heart && count > 0
      ? ` · ${count.toLocaleString("en-US")} ${count === 1 ? "favorite" : "favorites"}`
      : "";
  const className = heart ? "heart-chip is-button build-favorite-heart" : "build-card-save";
  if (!authenticated)
    return (
      <Link
        className={className}
        href="/signin"
        aria-label={`Sign in to save ${title}${counted}`}
        title="Sign in to save"
      >
        {heart ? (
          <span className="heart-chip-icon">
            <Icon size={size} aria-hidden="true" />
          </span>
        ) : (
          <Icon size={size} />
        )}
        {heart && count > 0 && <span className="numeric">{count.toLocaleString("en-US")}</span>}
      </Link>
    );
  async function toggle() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/community/build/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", active: !saved }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not update favorite. Try again.",
        );
      if (typeof body.favorite !== "boolean")
        throw new Error("The server did not confirm your favorite. Refresh and try again.");
      setCount((c) => Math.max(0, c + (body.favorite === saved ? 0 : body.favorite ? 1 : -1)));
      setSaved(body.favorite);
      setFeedback((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update favorite. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={`${saved ? "Unsave" : "Save"} ${title}${counted}`}
        aria-pressed={saved}
        aria-describedby={error ? messageId : undefined}
        disabled={busy}
        onClick={toggle}
        title={saved ? "Remove from favorites" : "Save build"}
      >
        <ReactionFeedback
          sequence={feedback}
          active={saved}
          className={heart ? "heart-chip-icon" : undefined}
        >
          <Icon size={size} fill={saved && !heart ? "currentColor" : "none"} />
        </ReactionFeedback>
        {count > 0 && <span className="numeric">{count.toLocaleString("en-US")}</span>}
      </button>
      {error && (
        <p id={messageId} role="alert" className="build-card-save-error">
          {error}
        </p>
      )}
    </>
  );
}
