"use client";
import { ArrowRight, Heart, ThumbsUp } from "lucide-react";
import { Disclosure } from "./disclosure";
import { EmptyWell } from "./empty-well";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { ReactionFeedback } from "./reaction-feedback";
import { TurnstileChallenge } from "./turnstile-challenge";
import { AvatarFrame } from "./avatar-frame";
import styles from "./community-panel.module.css";
import { displayName } from "@/lib/display-name";
type Comment = {
  id: string;
  body: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: { name: string | null; avatarFrame?: string | null };
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
  const pending = useRef(false);
  const [feedback, setFeedback] = useState({ favorite: 0, vote: 0 });
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
    if (pending.current) return false;
    const action = (input as { action?: string }).action;
    const protectedAction = ["comment", "edit-comment", "report"].includes(action || "");
    if (protectedAction && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setMessage("Complete the bot verification before posting.");
      return false;
    }
    pending.current = true;
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
      if (action === "favorite" || action === "vote")
        setFeedback((n) => ({ ...n, [action]: n[action] + 1 }));
      setMessage(success);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
      if (protectedAction) {
        setTurnstileToken("");
        setVerificationAttempt((n) => n + 1);
      }
    }
  }
  const noun = kind === "composition" ? "comp" : "build";
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby={`${kind}-community`}>
      <PanelHead
        id={`${kind}-community`}
        title="Community discussion"
        line="Favourites and votes are players' picks, not combat statistics."
        actions={
          data?.viewerId && (
            <Link className="pill-link is-small" href="/favorites">
              Your favorites <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )
        }
      />
      {data?.viewerId && (
        <TurnstileChallenge onToken={setTurnstileToken} attempt={verificationAttempt} />
      )}
      {data ? (
        <>
          <div className={`actions ${styles.reactions}`} hidden={!data.viewerId}>
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
              <ReactionFeedback sequence={feedback.favorite} active={data.favorite}>
                <Heart size={16} fill={data.favorite ? "currentColor" : "none"} />
              </ReactionFeedback>
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
                <ReactionFeedback sequence={feedback.vote} active={data.voted}>
                  <ThumbsUp size={16} fill={data.voted ? "currentColor" : "none"} />
                </ReactionFeedback>
                {data.voted ? "Remove vote" : "Upvote build"} ({data.voteCount})
              </button>
            )}
          </div>
          {data.viewerId ? (
            <form
              className={styles.compose}
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
              <label className={styles.field}>
                {edit ? "Edit your comment" : "Your comment"}
                <textarea
                  aria-label="Community comment"
                  value={body}
                  rows={3}
                  placeholder={`What works with this ${noun}, and what doesn't?`}
                  onChange={(e) => setBody(e.target.value)}
                  minLength={3}
                  maxLength={3000}
                  required
                />
              </label>
              <div className="actions">
                <button className="button primary" disabled={busy}>
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
          ) : (
            <div className={styles.signin}>
              <p>Sign in to favourite this {noun}, comment or report it.</p>
              <Link className="button secondary" href="/signin">
                Sign in with Discord
              </Link>
            </div>
          )}
          {data.comments.length ? (
            <ul className={styles.comments}>
              {data.comments.map((c) => (
                <li className={styles.comment} key={c.id}>
                  <p className={styles.byline}>
                    <AvatarFrame
                      frame={c.author.avatarFrame}
                      size={32}
                      name={displayName(c.author.name)}
                    />
                    <Link href={`/players/${c.authorId}`}>{displayName(c.author.name)}</Link>
                    <time dateTime={c.createdAt}>
                      {new Date(c.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {c.version > 1 && <span>Edited</span>}
                  </p>
                  <p className="preserve">{c.body}</p>
                  <div className={styles.commentActions}>
                    {data.viewerId === c.authorId && (
                      <>
                        <button
                          className="pill-link is-small"
                          onClick={() => {
                            setEdit(c);
                            setBody(c.body);
                          }}
                        >
                          Edit comment
                        </button>
                        <button
                          className="pill-link is-small"
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
                          className="pill-link is-small"
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
                    {data.viewerId && (
                      <button
                        className="pill-link is-small"
                        disabled={busy}
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
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyWell
              emblem="team-announce"
              title="No comments yet"
              line={`Played this ${noun}? Say what worked and what you would change.`}
            />
          )}
          {(data.page > 1 || data.hasNext) && (
            <nav className={styles.pager} aria-label="Comment pages">
              <button
                className="pill-link is-small"
                disabled={data.page === 1 || busy}
                onClick={() =>
                  refresh(data.page - 1).catch(() => setMessage("Could not load comments."))
                }
              >
                Previous comments
              </button>
              <span>Page {data.page}</span>
              <button
                className="pill-link is-small"
                disabled={!data.hasNext || busy}
                onClick={() =>
                  refresh(data.page + 1).catch(() => setMessage("Could not load comments."))
                }
              >
                Next comments
              </button>
            </nav>
          )}
          {history.length > 0 && (
            <Disclosure summary="Your comment revisions" defaultOpen>
              {history.map((r) => (
                <p className="preserve" key={r.version}>
                  Revision {r.version}: {r.body}
                </p>
              ))}
            </Disclosure>
          )}
          {data.viewerId && (
            <Disclosure summary={`Report this ${noun}`}>
              <form
                className={styles.compose}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await act({ action: "report", reason }, "Report submitted for review."))
                    setReason("");
                }}
              >
                <label className={styles.field}>
                  Reason for report
                  <textarea
                    rows={3}
                    minLength={10}
                    maxLength={2000}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button className="button secondary" disabled={busy}>
                  Submit content report
                </button>
              </form>
            </Disclosure>
          )}
          {message && <StatusLine>{message}</StatusLine>}
        </>
      ) : message ? (
        <EmptyWell
          emblem="team-announce"
          title="The discussion didn't load"
          line="Comments and favourites are kept; try again in a moment."
          action={
            <button
              className="button secondary"
              onClick={() =>
                refresh()
                  .then(() => setMessage(""))
                  .catch(() => setMessage("Discussion temporarily unavailable."))
              }
            >
              Retry discussion
            </button>
          }
        />
      ) : (
        <StatusLine>Loading the discussion…</StatusLine>
      )}
    </section>
  );
}
