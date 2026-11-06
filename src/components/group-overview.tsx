"use client";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import type { TeamContext } from "./group-dashboard";
import { EventDate, eventTime, isUpcoming, rsvpCount } from "./group-events";
import { CompRow, BuildRow } from "./group-shared";
import { MemberRow } from "./group-members";
import { plural } from "./group-parts";
import styles from "./teams.module.css";

/**
 * The workspace's front page, three columns like the landing: the next event beside the
 * latest announcements, then shared comps, shared builds and the roster.
 */
export function GroupOverview({ ctx }: { ctx: TeamContext }) {
  const { data, editor, now, setTab } = ctx;
  const upcoming = data.events.filter((e) => isUpcoming(e, now));
  const next = upcoming[0];
  const more = (label: string, tab: Parameters<TeamContext["setTab"]>[0]) => (
    <button type="button" className="pill-link is-small" onClick={() => setTab(tab)}>
      {label} <ArrowRight size={14} aria-hidden="true" />
    </button>
  );
  return (
    <div className={styles.overview}>
      <section
        className={`panel ${styles.panel} ${styles.wide}`}
        data-team-next-event=""
        aria-labelledby="team-next-event"
      >
        <PanelHead
          id="team-next-event"
          emblem="team-calendar"
          title="Next event"
          line={
            upcoming.length > 1
              ? `${plural(upcoming.length - 1, "more event")} after this one`
              : undefined
          }
          actions={next ? more("All events", "Events") : undefined}
        />
        {next ? (
          <div className={styles.nextEvent}>
            <EventDate event={next} large />
            <div className={styles.nextEventCopy}>
              <h3>{next.title}</h3>
              <p className={styles.eventWhen}>{eventTime(next)}</p>
              {next.description && <p className={styles.clamp}>{next.description}</p>}
              <dl className={styles.facts}>
                <div>
                  <dt>Expected</dt>
                  <dd>{next.expectedParticipants}</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{rsvpCount(next, "AVAILABLE")}</dd>
                </div>
                <div>
                  <dt>Maybe</dt>
                  <dd>{rsvpCount(next, "MAYBE")}</dd>
                </div>
              </dl>
              <div className={styles.rowActions}>
                <button type="button" className="button secondary" onClick={() => setTab("Events")}>
                  View event &amp; RSVP
                </button>
              </div>
            </div>
            {upcoming.length > 1 && (
              <ol className={styles.later} aria-label="Later events">
                {upcoming.slice(1, 4).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`well ${styles.wellRow}`}
                      onClick={() => setTab("Events")}
                    >
                      <EventDate event={e} />
                      <span className={styles.rowCopy}>
                        <strong>{e.title}</strong>
                        <small>{eventTime(e)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <EmptyWell
            title="No event scheduled"
            line="Set a time, the comp and the voice channel; members answer with their RSVP."
            action={
              editor ? (
                <button type="button" className="button secondary" onClick={ctx.newEvent}>
                  Schedule an event
                </button>
              ) : undefined
            }
          />
        )}
      </section>
      <section className={`panel ${styles.panel}`} aria-labelledby="team-latest-news">
        <PanelHead
          id="team-latest-news"
          emblem="team-announce"
          title="Announcements"
          actions={
            data.announcements.length
              ? more("View all", "Announcements")
              : editor
                ? more("Write one", "Announcements")
                : undefined
          }
        />
        {data.announcements.length ? (
          <ul className={styles.list}>
            {data.announcements.slice(0, 3).map((a) => (
              <li key={a.id} className={`well ${styles.note}`}>
                <h3>{a.title}</h3>
                <p className={styles.clamp}>{a.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            title="No announcements yet"
            line="Officers post here; every member reads it."
          />
        )}
      </section>
      <section className={`panel ${styles.panel}`} aria-labelledby="team-comps">
        <PanelHead
          id="team-comps"
          emblem="team-comps"
          title="Shared comps"
          line={data.compositions.length ? plural(data.compositions.length, "comp") : undefined}
          actions={
            data.compositions.length
              ? more("Open comps", "Comps")
              : editor
                ? more("Share a comp", "Comps")
                : undefined
          }
        />
        {data.compositionPreviews.length ? (
          <ul className={styles.list}>
            {data.compositionPreviews.slice(0, 3).map((c) => (
              <li key={c.id}>
                <CompRow comp={c} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            title="No shared comps yet"
            line="Save a comp to this team so every member sees the same roster."
          />
        )}
      </section>
      <section className={`panel ${styles.panel}`} aria-labelledby="team-builds">
        <PanelHead
          id="team-builds"
          emblem="strip-builds"
          title="Shared builds"
          line={data.builds.length ? plural(data.builds.length, "build") : undefined}
          actions={
            data.builds.length
              ? more("Open builds", "Builds")
              : editor
                ? more("Share a build", "Builds")
                : undefined
          }
        />
        {data.builds.length ? (
          <ul className={styles.list}>
            {data.builds.slice(0, 3).map((b) => (
              <li key={b.id}>
                <BuildRow build={b} onOpen={() => setTab("Builds")} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            title="No shared builds yet"
            line="Copy a build into the team so members gear the same set."
          />
        )}
      </section>
      <section className={`panel ${styles.panel}`} aria-labelledby="team-roster">
        <PanelHead
          id="team-roster"
          emblem="team-roles"
          title="Members"
          line={plural(data.memberCount, "member")}
          actions={more("All members", "Members")}
        />
        <ul className={styles.list}>
          {data.members.slice(0, 5).map((m) => (
            <li key={m.userId}>
              <MemberRow member={m} />
            </li>
          ))}
        </ul>
        {data.memberCount > 5 && (
          <button type="button" className={styles.moreLink} onClick={() => setTab("Members")}>
            {plural(data.memberCount - 5, "more member")}{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
      </section>
    </div>
  );
}
