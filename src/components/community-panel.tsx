"use client";
import { useEffect, useState } from "react";
import Link from "@/components/link";
import { TurnstileChallenge } from "./turnstile-challenge";
type Comment = {
  id: string;
  body: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: { name: string | null };
};
type Activity = {
  viewerId: string | null;
  favorite: boolean;
  favoriteCount: number;
  voted: boolean;
  voteCount: number | null;
  comments: Comment[];
  hasNext: boolean;
  page: number;
};
export function CommunityPanel({ kind, id }: { kind: "build" | "composition"; id: string }) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [data, setData] = useState<Activity | null>(null),
    [message, setMessage] = useState(""),
    [body, setBody] = useState(""),
    [reason, setReason] = useState(""),
    [edit, setEdit] = useState<Comment | null>(null),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<{ version: number; body: string }[]>([]);
  const url = `/api/community/${kind}/${id}`;
  async function refresh(page = 1) {
    const r = await fetch(`${url}?page=${page}`),
      b = await r.json();
    if (!r.ok) throw new Error(b.error);
    setData(b);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        return b;
      })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted)
          setMessage(e instanceof Error ? e.message : "Discussion unavailable");
      });
    return () => controller.abort();
  }, [url]);
  async function act(input: unknown, success: string) {
    const action = (input as { action?: string }).action;
    const protectedAction = ["comment", "edit-comment", "report"].includes(action || "");
    if (protectedAction && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setMessage("Complete the bot verification before posting.");
      return false;
    }
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(protectedAction && turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
          },
          body: JSON.stringify(input),
        }),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      await refresh();
      setMessage(success);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
      if (protectedAction) {
        setTurnstileToken("");
        setVerificationAttempt((n) => n + 1);
      }
    }
  }
  return (
    <section className="panel section">
      <h2>Community discussion</h2>
      {data?.viewerId && (
        <TurnstileChallenge onToken={setTurnstileToken} attempt={verificationAttempt} />
      )}
      <p className="muted">
        Ratings are community votes, not verified combat statistics. Visibility rules apply to every
        action.
      </p>
      {data ? (
        <>
          <div className="actions">
            <button
              className="button secondary"
              disabled={busy}
              aria-pressed={data.favorite}
              onClick={() =>
                act(
                  { action: "favorite", active: !data.favorite },
                  data.favorite ? "Favorite removed." : "Saved to favorites.",
                )
              }
            >
              {data.favorite ? "Remove favorite" : "Add favorite"} ({data.favoriteCount})
            </button>
            {kind === "build" && (
              <button
                className="button secondary"
                disabled={busy}
                aria-pressed={data.voted}
                onClick={() =>
                  act(
                    { action: "vote", active: !data.voted },
                    data.voted ? "Vote removed." : "Vote recorded.",
                  )
                }
              >
                {data.voted ? "Remove vote" : "Upvote build"} ({data.voteCount})
              </button>
            )}
            <Link className="text-link" href="/favorites">
              Your favorites
            </Link>
          </div>
          {!data.viewerId && (
            <p>
              <Link className="text-link" href="/signin">
                Sign in with Discord
              </Link>{" "}
              to participate.
            </p>
          )}
          <form
            className="section"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act(
                  edit
                    ? { action: "edit-comment", commentId: edit.id, version: edit.version, body }
                    : { action: "comment", body },
                  edit ? "Comment updated." : "Comment posted.",
                )
              ) {
                setBody("");
                setEdit(null);
              }
            }}
          >
            <label>
              {edit ? "Edit your comment" : "Your comment"}
              <textarea
                aria-label="Community comment"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                minLength={3}
                maxLength={3000}
                required
              />
            </label>
            <div className="actions">
              <button className="button primary" disabled={busy || !data.viewerId}>
                {edit ? "Save comment revision" : "Post comment"}
              </button>
              {edit && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEdit(null);
                    setBody("");
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
          <div className="section">
            {data.comments.map((c) => (
              <article className="panel section" key={c.id}>
                <p>
                  <Link className="text-link" href={`/players/${c.authorId}`}>
                    {c.author.name || "Adventurer"}
                  </Link>{" "}
                  · <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString()}</time> · v
                  {c.version}
                </p>
                <p className="preserve">{c.body}</p>
                <div className="actions">
                  {data.viewerId === c.authorId && (
                    <>
                      <button
                        className="button secondary"
                        onClick={() => {
                          setEdit(c);
                          setBody(c.body);
                        }}
                      >
                        Edit comment
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Delete this comment from the discussion?"))
                            act(
                              { action: "delete-comment", commentId: c.id, version: c.version },
                              "Comment deleted.",
                            );
                        }}
                      >
                        Delete comment
                      </button>
                      <button
                        className="button secondary"
                        onClick={async () => {
                          try {
                            const r = await fetch(`${url}?history=${c.id}`),
                              b = await r.json();
                            if (!r.ok) throw new Error(b.error);
                            setHistory(b.revisions);
                          } catch (e) {
                            setMessage(e instanceof Error ? e.message : "History unavailable");
                          }
                        }}
                      >
                        Comment edit history
                      </button>
                    </>
                  )}
                  <button
                    className="button secondary"
                    disabled={busy || !data.viewerId}
                    onClick={() => {
                      const reason = window.prompt(
                        "Explain why this comment needs moderation (10–2000 characters).",
                      );
                      if (reason)
                        act(
                          { action: "report", commentId: c.id, reason },
                          "Comment report submitted for review.",
                        );
                    }}
                  >
                    Report comment
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!data.comments.length && (
            <p className="empty">No visible comments yet. Share a useful observation.</p>
          )}
          <div className="actions">
            <button
              className="button secondary"
              disabled={data.page === 1 || busy}
              onClick={() =>
                refresh(data.page - 1).catch(() => setMessage("Could not load comments."))
              }
            >
              Previous comments
            </button>
            <span>Page {data.page}</span>
            <button
              className="button secondary"
              disabled={!data.hasNext || busy}
              onClick={() =>
                refresh(data.page + 1).catch(() => setMessage("Could not load comments."))
              }
            >
              Next comments
            </button>
          </div>
          <details className="section">
            <summary>Report this {kind}</summary>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await act({ action: "report", reason }, "Report submitted for review."))
                  setReason("");
              }}
            >
              <label>
                Reason for report
                <textarea
                  minLength={10}
                  maxLength={2000}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button className="button secondary" disabled={busy || !data.viewerId}>
                Submit content report
              </button>
            </form>
          </details>
          {history.length > 0 && (
            <section className="section">
              <h3>Your comment revisions</h3>
              {history.map((r) => (
                <p className="preserve" key={r.version}>
                  v{r.version}: {r.body}
                </p>
              ))}
            </section>
          )}
        </>
      ) : (
        <button
          className="button secondary"
          onClick={() =>
            refresh().catch(() => setMessage("Discussion temporarily unavailable. Retry later."))
          }
        >
          Retry discussion
        </button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
