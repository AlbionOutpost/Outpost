"use client";
import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { ReactionFeedback } from "@/components/reaction-feedback";
type Likes = {
  count: number;
  archivedCount: number;
  outpostCount: number;
  liked: boolean;
  signedIn: boolean;
};
export function AccountLikeChip({
  kind,
  slug,
  title,
  archivedCount = 0,
}: {
  kind: "build" | "composition";
  slug: string;
  title: string;
  archivedCount?: number;
}) {
  const generation = useRef({ version: 0 });
  const pending = useRef(false);
  const [value, setValue] = useState<Likes | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(0);
  const [note, setNote] = useState("");
  const url = `/api/library-likes/${kind}/${encodeURIComponent(slug)}`;
  useEffect(() => {
    const requests = generation.current;
    const controller = new AbortController();
    const read = async () => {
      if (pending.current) return;
      const version = ++generation.current.version;
      try {
        const r = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!r.ok) throw Error("Likes are unavailable. Please try again later.");
        const body = await r.json();
        if (version === generation.current.version) setValue(body);
      } catch (e) {
        if (!controller.signal.aborted && version === generation.current.version)
          setNote(e instanceof Error ? e.message : "Likes unavailable.");
      }
    };
    void read();
    window.addEventListener("focus", read);
    return () => {
      requests.version++;
      controller.abort();
      window.removeEventListener("focus", read);
    };
  }, [url]);
  const label = !value?.signedIn
    ? `Sign in to like ${title}`
    : `${value.liked ? "Unlike" : "Like"} ${title}`;
  async function toggle() {
    if (!value?.signedIn || pending.current) return;
    const version = ++generation.current.version;
    pending.current = true;
    setBusy(true);
    setNote("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !value.liked }),
      });
      const body = await r.json();
      if (version !== generation.current.version) return;
      if (!r.ok) {
        if (r.status === 401) setValue({ ...value, signedIn: false });
        throw Error(body.error || "Could not update your like.");
      }
      setValue(body);
      setFeedback((n) => n + 1);
      setNote(body.liked ? "Liked. Saved to your account." : "Like removed from your account.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not update your like.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={`heart-chip is-button${value?.liked ? " is-on" : ""}`}
        disabled={!value?.signedIn || busy}
        aria-pressed={value?.liked ?? false}
        aria-label={`${label} · ${(value?.count ?? archivedCount).toLocaleString("en-US")} likes`}
        aria-busy={busy}
        title={`${value?.archivedCount ?? archivedCount} archived votes + ${value?.outpostCount ?? 0} Outpost likes${!value?.signedIn ? " · Sign in to like" : ""}`}
        onClick={toggle}
      >
        <ReactionFeedback
          sequence={feedback}
          active={value?.liked ?? false}
          className="heart-chip-icon"
        >
          <Heart size={13} />
        </ReactionFeedback>
        {(value?.count ?? archivedCount).toLocaleString("en-US")}
      </button>
      <span className="sr-only" role="status">
        {note}
      </span>
    </>
  );
}
