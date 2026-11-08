"use client";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "@/components/link";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import type { TeamContext } from "./group-dashboard";
import { EventDate, EventTime, isUpcoming, rsvpCount } from "./group-events";
import { CompRow, BuildRow } from "./group-shared";
import { MemberRow } from "./group-members";
import { plural } from "./group-parts";
import styles from "./teams.module.css";
import roleStyles from "./group-roles.module.css";

type Quick = { emblem: string; label: string; line: string } & (
  { href: string; onClick?: never } | { onClick: () => void; href?: never }
);

/**
 * The workspace's front page. A hero row (the next event, then the things this member can do
 * from here) and the team's loadouts in the wide column; the roster and the leaders' news in a
 * side rail. Panels keep their own heights; empty parts say so in one line with the way to fill
 * them, so nothing stands half-empty.
 */
export function GroupOverview({ ctx }: { ctx: TeamContext }) {
  const { data, now, setTab, can } = ctx;
  const upcoming = data.events.filter((e) => isUpcoming(e, now));
  const next = upcoming[0];
  const more = (label: string, onClick: () => void) => (
    <button type="button" className="pill-link is-small" onClick={onClick}>
      {label} <ArrowRight size={14} aria-hidden="true" />
    </button>
  );
  const invite = () => {
    setTab("Members");
    requestAnimationFrame(() =>
      document.getElementById("team-invites")?.scrollIntoView({ block: "center" }),
    );
  };
  // Only what this member may do; every one of them is checked again by the server
  const quick: Quick[] = [
    can("manageEvents") && {
      emblem: "team-announce",
      label: "Post news",
      line: "Tell every member",
      onClick: () => setTab("Announcements"),
    },
    can("manageComps") && {
      emblem: "team-comps",
      label: "Create a comp",
      line: "Save a roster here",
      href: "/compositions/new",
    },
    can("manageBuilds") && {
      emblem: "strip-builds",
      label: "Share a build",
      line: "One set for all",
      onClick: () => setTab("Loadouts", "builds"),
    },
    can("inviteMembers") && {
      emblem: "team-roles",
      label: "Invite",
      line: "A single-use link",
      onClick: invite,
    },
    {
      emblem: "team-loot",
      label: "Loot splits",
      line: "Who gets what",
      onClick: () => setTab("Treasury", "loot"),
    },
    {
      emblem: "trophy-silver-64w",
      label: "Flip a coin",
      line: "Settle a tie",
      onClick: () => setTab("Treasury", "rolls"),
    },
  ].filter((q): q is Quick => !!q);
  const comps = data.compositionPreviews.slice(0, 3);
  const builds = data.builds.slice(0, 3);
  return (
    <div className={styles.overview}>
      <div className={styles.overviewColumn}>
        <section
          className={`panel ${styles.panel} ${styles.hero}`}
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
                : next
                  ? "The only event coming up"
                  : "Mass-ups, raids and gathering trips"
            }
            actions={next ? more("All events", () => setTab("Events")) : undefined}
          />
          {next ? (
            <div className={styles.nextEvent}>
              <EventDate event={next} large />
              <div className={styles.nextEventCopy}>
                <h3>{next.title}</h3>
                <p className={styles.eventWhen}>
                  <EventTime event={next} now={now} />
                </p>
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
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setTab("Events")}
                  >
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
                          <small>
                            <EventTime event={e} now={now} />
                          </small>
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
              line={
                can("manageEvents")
                  ? "Set a time, the comp and the voice channel; members answer with their RSVP."
                  : "Leaders with Manage events schedule them; you answer with your RSVP."
              }
              action={
                can("manageEvents") ? (
                  <button type="button" className="button secondary" onClick={ctx.newEvent}>
                    Schedule an event
                  </button>
                ) : undefined
              }
            />
          )}
          <ul className={styles.quick} aria-label="Quick actions">
            {quick.map((q) => {
              const body = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- painted emblem */}
                  <img src={`/albion/icons/${q.emblem}.webp`} alt="" width={36} height={36} />
                  <span>
                    <strong>{q.label}</strong>
                    <small>{q.line}</small>
                  </span>
                </>
              );
              return (
                <li key={q.label}>
                  {q.href ? (
                    <Link className="well" href={q.href}>
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className="well" onClick={q.onClick}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className={`panel ${styles.panel}`} aria-labelledby="team-loadouts-summary">
          <PanelHead
            id="team-loadouts-summary"
            emblem="team-comps"
            title="Loadouts"
            line={`${plural(data.compositions.length, "comp")} · ${plural(data.builds.length, "build")} shared with members`}
            actions={
              data.compositions.length || data.builds.length
                ? more("Open loadouts", () => setTab("Loadouts"))
                : undefined
            }
          />
          <div className={styles.loadoutPair}>
            <div>
              <h3 className={styles.subhead}>Comps</h3>
              {comps.length ? (
                <ul className={styles.list}>
                  {comps.map((c) => (
                    <li key={c.id}>
                      <CompRow comp={c} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.quietEmpty}>
                  <span>No shared comps yet.</span>
                  {can("manageComps") && (
                    <Link className="pill-link is-small" href="/compositions/new">
                      Create a comp
                    </Link>
                  )}
                </p>
              )}
            </div>
            <div>
              <h3 className={styles.subhead}>Builds</h3>
              {builds.length ? (
                <ul className={styles.list}>
                  {builds.map((b) => (
                    <li key={b.id}>
                      <BuildRow build={b} onOpen={() => setTab("Loadouts", "builds")} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.quietEmpty}>
                  <span>No shared builds yet.</span>
                  {can("manageBuilds") && (
                    <button
                      type="button"
                      className="pill-link is-small"
                      onClick={() => setTab("Loadouts", "builds")}
                    >
                      Share a build
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
      <aside className={styles.overviewColumn} aria-label="Team rail">
        <section
          className={`panel ${styles.panel}`}
          aria-labelledby="team-roster"
          data-team-roster=""
        >
          <PanelHead
            id="team-roster"
            emblem="team-roles"
            title="Members"
            line={plural(data.memberCount, "member")}
            actions={more("All", () => setTab("Members"))}
          />
          {/* How the roster splits by role: the Leader, then each role that anyone holds */}
          <ul className={styles.rosterTally} aria-label="Members by role">
            <li className={`${roleStyles.chip} ${roleStyles.tone}`} data-role-color="gold">
              <span>Leader</span> <b>1</b>
            </li>
            {data.roles
              .filter((r) => r.members > 0)
              .map((r) => (
                <li
                  key={r.id}
                  className={`${roleStyles.chip} ${roleStyles.tone}`}
                  data-role-color={r.color}
                >
                  <span>{r.name}</span> <b>{r.members.toLocaleString("en")}</b>
                </li>
              ))}
          </ul>
          <ul className={styles.list}>
            {data.members.slice(0, 5).map((m) => (
              <li key={m.userId}>
                <MemberRow member={m} roles={data.roles} self={m.userId === ctx.userId} />
              </li>
            ))}
          </ul>
          {data.memberCount === 1 && (
            <p className={styles.quietEmpty}>
              <span>Just you so far.</span>
              {can("inviteMembers") && (
                <button type="button" className="pill-link is-small" onClick={invite}>
                  Invite members
                </button>
              )}
            </p>
          )}
          {data.memberCount > 5 && (
            <button type="button" className={styles.moreLink} onClick={() => setTab("Members")}>
              {plural(data.memberCount - 5, "more member")}{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          )}
        </section>
        <section className={`panel ${styles.panel}`} aria-labelledby="team-latest-news">
          <PanelHead
            id="team-latest-news"
            emblem="team-announce"
            title="Announcements"
            line={data.announcements.length ? "Newest first" : "News from the leaders"}
            actions={
              data.announcements.length ? more("All", () => setTab("Announcements")) : undefined
            }
          />
          {data.announcements.length ? (
            <ul className={styles.list}>
              {data.announcements.slice(0, 2).map((a) => (
                <li key={a.id} className={`well ${styles.note}`}>
                  <h3>{a.title}</h3>
                  <p className={styles.clamp}>{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.quietEmpty}>
              <span>No announcements yet.</span>
              {can("manageEvents") && (
                <button
                  type="button"
                  className="pill-link is-small"
                  onClick={() => setTab("Announcements")}
                >
                  Write one
                </button>
              )}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
