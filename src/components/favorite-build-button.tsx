"use client";
import { useId, useState } from "react";
import { Star } from "lucide-react";
import Link from "next/link";
export function FavoriteBuildButton({
  id,
  title,
  authenticated,
  initialSaved,
  initialCount,
}: {
  id: string;
  title: string;
  authenticated: boolean;
  initialSaved: boolean;
  initialCount: number;
}) {
  const [saved, setSaved] = useState(initialSaved),
    [count, setCount] = useState(initialCount),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const messageId = useId();
  if (!authenticated)
    return (
      <Link
        className="build-card-save"
        href="/signin"
        aria-label={`Sign in to save ${title}`}
        title="Sign in to save"
      >
        <Star size={17} />
      </Link>
    );
  async function toggle() {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update favorite. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="build-card-save"
        aria-label={`${saved ? "Unsave" : "Save"} ${title}`}
        aria-pressed={saved}
        aria-describedby={error ? messageId : undefined}
        disabled={busy}
        onClick={toggle}
        title={saved ? "Remove from favorites" : "Save build"}
      >
        <Star size={17} fill={saved ? "currentColor" : "none"} />
        {count > 0 && <span className="numeric">{count}</span>}
      </button>
      {error && (
        <p id={messageId} role="alert" className="build-card-save-error">
          {error}
        </p>
      )}
    </>
  );
}
