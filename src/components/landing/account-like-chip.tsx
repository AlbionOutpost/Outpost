"use client";
import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { ReactionFeedback } from "@/components/reaction-feedback";

const FOCUS_REFRESH = 5 * 60_000;
type Likes = {
  count: number;
  archivedCount: number;
  outpostCount: number;
  liked: boolean;
  signedIn: boolean;
};

/**
 * Chips that read in the same tick share one `GET /api/library-likes?items=…` request: the
 * homepage's build and comp chips cost one read on load and one on a focus refresh, not two.
 * The answer is per account and never cached.
 */
let queue: { key: string; resolve: (likes: Likes) => void; reject: (error: Error) => void }[] = [];
function readLikes(kind: string, slug: string) {
  return new Promise<Likes>((resolve, reject) => {
    if (!queue.length) setTimeout(flush, 0);
    queue.push({ key: `${kind}:${slug}`, resolve, reject });
  });
}
async function flush() {
  const batch = queue;
  queue = [];
  const keys = [...new Set(batch.map((entry) => entry.key))];
  const failed = () => Error("Likes are unavailable. Please try again later.");
  for (let i = 0; i < keys.length; i += 10) {
    const chunk = keys.slice(i, i + 10);
    const waiting = batch.filter((entry) => chunk.includes(entry.key));
    try {
      const r = await fetch(
        `/api/library-likes?${new URLSearchParams({ items: chunk.join(",") })}`,
        {
          cache: "no-store",
        },
      );
      if (!r.ok) throw failed();
      const body = (await r.json()) as {
        signedIn: boolean;
        items: Record<string, (Omit<Likes, "signedIn"> & { found: true }) | { found: false }>;
      };
      for (const entry of waiting) {
        const item = body.items?.[entry.key];
        if (item?.found)
          entry.resolve({
            count: item.count,
            archivedCount: item.archivedCount,
            outpostCount: item.outpostCount,
            liked: item.liked,
            signedIn: !!body.signedIn,
          });
        else entry.reject(failed());
      }
    } catch {
      for (const entry of waiting) entry.reject(failed());
    }
  }
}
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
    let lastRead = 0;
    const read = async () => {
      if (pending.current) return;
      lastRead = Date.now();
      const version = ++generation.current.version;
      try {
        const body = await readLikes(kind, slug);
        if (!controller.signal.aborted && version === generation.current.version) setValue(body);
      } catch (e) {
        if (!controller.signal.aborted && version === generation.current.version)
          setNote(e instanceof Error ? e.message : "Likes unavailable.");
      }
    };
    // Coming back to the tab refreshes a like made elsewhere, but at most every five minutes:
    // each read costs a Worker, a Durable Object and a D1 request.
    const refresh = () => {
      if (Date.now() - lastRead >= FOCUS_REFRESH) void read();
    };
    void read();
    window.addEventListener("focus", refresh);
    return () => {
      requests.version++;
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [kind, slug]);
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
