"use client";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import type { TeamContext } from "./group-dashboard";
import { Field, plural } from "./group-parts";
import styles from "./teams.module.css";

/** Officers post on the left; every member reads the board on the right. */
export function GroupAnnouncements({ ctx }: { ctx: TeamContext }) {
  const { data, busy, run } = ctx;
  const editor = ctx.can("manageEvents");
  return (
    <div className={editor ? styles.split : undefined} id="guild-announcements">
      {editor && (
        <section className={`panel ${styles.panel}`} aria-labelledby="team-post">
          <PanelHead
            id="team-post"
            title="Post an announcement"
            line="Every member sees it here."
          />
          <form
            className={styles.form}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              if (await run({ action: "announcement", title: f.get("title"), body: f.get("body") }))
                form.reset();
            }}
          >
            <Field label="Announcement title">
              <input
                name="title"
                required
                minLength={3}
                maxLength={100}
                placeholder="Mass-up at 20:00"
              />
            </Field>
            <Field label="Announcement text">
              <textarea name="body" required maxLength={8000} rows={6} />
            </Field>
            <div className={styles.formActions}>
              <button className="button primary" disabled={busy}>
                Publish announcement
              </button>
            </div>
          </form>
        </section>
      )}
      <section className={`panel ${styles.panel}`} aria-labelledby="team-board">
        <PanelHead
          id="team-board"
          emblem="team-announce"
          title="Announcements"
          line={
            data.announcements.length
              ? `${plural(data.announcements.length, "post")}, newest first`
              : undefined
          }
        />
        {data.announcements.length ? (
          <ul className={styles.list}>
            {data.announcements.map((a) => (
              <li key={a.id} className={`well ${styles.note}`}>
                <h3>{a.title}</h3>
                <p className="preserve">{a.body}</p>
                {editor && (
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={`button secondary ${styles.lossButton}`}
                      disabled={busy}
                      aria-label={`Remove announcement ${a.title}`}
                      onClick={() => run({ action: "remove-announcement", id: a.id })}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            emblem="team-announce"
            title="No announcements yet"
            line={
              editor
                ? "Post the first one with the form."
                : "Members with Manage events post news for the team here."
            }
            action={
              <button
                type="button"
                className="button secondary"
                onClick={() => ctx.setTab("Events")}
              >
                See the events
              </button>
            }
          />
        )}
      </section>
    </div>
  );
}
