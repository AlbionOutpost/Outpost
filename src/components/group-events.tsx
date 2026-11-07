"use client";
import { useState } from "react";
import { CalendarArrowDown, ChevronDown, Swords } from "lucide-react";
import Link from "@/components/link";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { EditorDialog } from "./editor-dialog";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import { GroupEventEditor } from "./group-event-editor";
import type { TeamContext } from "./group-dashboard";
import { Field, plural } from "./group-parts";
import styles from "./teams.module.css";

type TeamEvent = GroupDashboardData["events"][number];
const rsvpLabel: Record<string, string> = {
  AVAILABLE: "Available",
  MAYBE: "Maybe",
  UNAVAILABLE: "Unavailable",
};

export const isUpcoming = (e: TeamEvent, now: number) =>
  !e.cancelled && Date.parse(e.startsAt) > now;
export const rsvpCount = (e: TeamEvent, status: string) =>
  e.rsvps.filter((r) => r.status === status).length;

/** "Saturday 8 November, 20:00 · Europe/Berlin", in the event's own timezone. */
export function eventTime(e: TeamEvent) {
  const when = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: e.timezone,
  }).format(new Date(e.startsAt));
  return `${when} · ${e.timezone}`;
}

/** The event's day as a calendar leaf: month over a Barlow day number. */
export function EventDate({ event, large }: { event: TeamEvent; large?: boolean }) {
  const date = new Date(event.startsAt);
  const part = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...o, timeZone: event.timezone }).format(date);
  return (
    <time
      className={`well ${styles.leaf}`}
      data-size={large ? "large" : undefined}
      dateTime={event.startsAt}
      aria-hidden="true"
    >
      <small>{part({ month: "short" })}</small>
      <b>{part({ day: "numeric" })}</b>
      {large && <small>{part({ weekday: "short" })}</small>}
    </time>
  );
}

/** Every loaded event, filtered by status, each opening to its details and the RSVP form. */
export function GroupEvents({
  ctx,
  filter,
  onFilter,
}: {
  ctx: TeamContext;
  filter: string;
  onFilter: (value: string) => void;
}) {
  const { data, now } = ctx;
  const editor = ctx.can("manageEvents");
  const schedule = data.events.filter(
    (e) => filter === "all" || (filter === "upcoming" ? isUpcoming(e, now) : !isUpcoming(e, now)),
  );
  // Upcoming reads soonest first; past and cancelled read newest first.
  const ordered = filter === "upcoming" ? schedule : schedule.toReversed();
  const [open, setOpen] = useState<string | null>(ordered[0]?.id ?? null);
  return (
    <section className={`panel ${styles.panel}`} id="guild-events" aria-labelledby="team-events">
      <PanelHead
        id="team-events"
        emblem="team-calendar"
        title="Events"
        line={`${plural(ordered.length, "event")} · times in each event's own timezone`}
        actions={
          <label className={styles.inlineLabel}>
            <span className="sr-only">Show events</span>
            <WellSelect
              aria-label="Team event status"
              value={filter}
              onChange={(event) => {
                onFilter(event.target.value);
                setOpen(null);
              }}
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past &amp; cancelled</option>
              <option value="all">All loaded events</option>
            </WellSelect>
          </label>
        }
      />
      {ordered.length ? (
        <ul className={styles.list}>
          {ordered.map((e) => (
            <li key={e.id}>
              <EventCard
                ctx={ctx}
                event={e}
                open={open === e.id || (open === null && e.id === ordered[0].id)}
                onToggle={() => setOpen(open === e.id ? "" : e.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyWell
          title={filter === "upcoming" ? "No event scheduled" : "No events in this view"}
          line={
            filter === "upcoming"
              ? "Set a time, the comp and the voice channel; members answer with their RSVP."
              : "Choose another status to see the rest."
          }
          action={
            editor && filter === "upcoming" ? (
              <button type="button" className="button secondary" onClick={ctx.newEvent}>
                Schedule an event
              </button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}

function EventCard({
  ctx,
  event: e,
  open,
  onToggle,
}: {
  ctx: TeamContext;
  event: TeamEvent;
  open: boolean;
  onToggle: () => void;
}) {
  const { groupId, userId, busy, run } = ctx;
  const editor = ctx.can("manageEvents");
  const mine = e.rsvps.find((r) => r.userId === userId);
  const detailId = `team-event-${e.id}`;
  return (
    <article className={`well ${styles.event}`} data-cancelled={e.cancelled ? "" : undefined}>
      <div className={styles.eventHead}>
        <EventDate event={e} />
        <div className={styles.rowCopy}>
          <h3>
            {e.title}
            {e.cancelled && <span className={styles.cancelled}> · Cancelled</span>}
          </h3>
          <small>{eventTime(e)}</small>
        </div>
        <span className={`landing-chips ${styles.eventChips}`}>
          <span className="landing-chip is-muted">{e.expectedParticipants} expected</span>
          <span className="landing-chip">{rsvpCount(e, "AVAILABLE")} available</span>
        </span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={detailId}
          onClick={onToggle}
        >
          <span className="sr-only">{open ? "Hide" : "Show"} details for </span>
          <span className="sr-only">{e.title}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
      <div id={detailId} className={styles.eventBody} hidden={!open}>
        <div className={styles.eventMain}>
          {e.description && <p className="preserve">{e.description}</p>}
          <dl className={styles.eventFacts}>
            <div>
              <dt>Voice</dt>
              <dd>{e.voiceInfo || "Not set"}</dd>
            </div>
            <div>
              <dt>Answers</dt>
              <dd>
                {rsvpCount(e, "AVAILABLE")} available · {rsvpCount(e, "MAYBE")} maybe ·{" "}
                {rsvpCount(e, "UNAVAILABLE")} unavailable
              </dd>
            </div>
          </dl>
          {e.rsvps.length > 0 && (
            <ul className={styles.rsvps} aria-label={`Answers for ${e.title}`}>
              {e.rsvps.map((r) => (
                <li key={r.userId} data-status={r.status}>
                  {r.name} · {rsvpLabel[r.status] ?? r.status}
                  {r.role ? ` · ${r.role}` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className={styles.rowActions}>
            <a
              className="pill-link is-small"
              href={`/api/groups/${groupId}/events/${e.id}/calendar`}
            >
              <CalendarArrowDown size={14} aria-hidden="true" /> Add to calendar
            </a>
            {e.compositionId && (
              <Link className="pill-link is-small" href={`/compositions/${e.compositionId}`}>
                <Swords size={14} aria-hidden="true" /> Assigned comp
              </Link>
            )}
            {editor && !e.cancelled && <GroupEventEditor groupId={groupId} event={e} />}
            {editor && !e.cancelled && (
              <button
                type="button"
                className={`pill-link is-small ${styles.lossButton}`}
                disabled={busy}
                onClick={() => run({ action: "cancel-event", eventId: e.id })}
              >
                Cancel event
              </button>
            )}
          </div>
        </div>
        {!e.cancelled && (
          <form
            className={`well ${styles.rsvpForm}`}
            aria-label={`Your answer for ${e.title}`}
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              run({ action: "rsvp", eventId: e.id, status: f.get("status"), role: f.get("role") });
            }}
          >
            <p className={styles.rsvpTitle}>{mine ? "Your answer" : "Will you be there?"}</p>
            <Field label="Your response">
              <WellSelect
                name="status"
                aria-label={`RSVP for ${e.title}`}
                defaultValue={mine?.status || "AVAILABLE"}
              >
                <option value="AVAILABLE">Available</option>
                <option value="MAYBE">Maybe</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </WellSelect>
            </Field>
            <Field label="Your role">
              <input
                name="role"
                maxLength={60}
                placeholder="Healer, tank, scout…"
                defaultValue={mine?.role || ""}
              />
            </Field>
            <button className="button primary" disabled={busy}>
              Save RSVP
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

/** The New event form, in a dialog, for officers and up. */
export function GroupEventDialog({
  ctx,
  open,
  onClose,
}: {
  ctx: TeamContext;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <EditorDialog open={open} title="Create team event" onClose={onClose}>
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          if (
            await ctx.run({
              action: "event",
              title: f.get("title"),
              description: f.get("description"),
              startsAt: new Date(String(f.get("startsAt"))).toISOString(),
              timezone: f.get("timezone"),
              expectedParticipants: Number(f.get("expectedParticipants")),
              voiceInfo: f.get("voiceInfo"),
              compositionId: f.get("compositionId") || null,
            })
          )
            form.reset();
        }}
      >
        <div className={styles.formGrid}>
          <Field label="Event title" wide>
            <input
              name="title"
              required
              minLength={3}
              maxLength={100}
              placeholder="Castle defence"
            />
          </Field>
          <Field label="Start time (your device local time)">
            <input name="startsAt" type="datetime-local" required />
          </Field>
          <Field label="Display timezone">
            <input name="timezone" required defaultValue="Europe/Berlin" maxLength={80} />
          </Field>
          <Field label="Expected participants">
            <input
              name="expectedParticipants"
              type="number"
              min={1}
              max={400}
              defaultValue={20}
              required
            />
          </Field>
          <Field label="Voice channel information">
            <input name="voiceInfo" maxLength={200} placeholder="Discord · #mass-up" />
          </Field>
          <Field label="Assigned comp" wide>
            <WellSelect name="compositionId" aria-label="Assigned comp">
              <option value="">No assigned comp</option>
              {ctx.data.compositions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </WellSelect>
          </Field>
          <Field label="Event description" wide>
            <textarea name="description" maxLength={4000} />
          </Field>
        </div>
        <div className={styles.formActions}>
          <button type="button" className="button secondary" onClick={onClose}>
            Not now
          </button>
          <button className="button primary" disabled={ctx.busy}>
            Schedule event
          </button>
        </div>
      </form>
    </EditorDialog>
  );
}
