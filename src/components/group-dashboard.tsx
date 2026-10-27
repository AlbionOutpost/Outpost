"use client";
import { GroupEventEditor } from "./group-event-editor";
import { useState, type ReactNode } from "react";
import { EditorDialog } from "./editor-dialog";
import { EquipmentStrip } from "./equipment-strip";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { canEditShared, canManageMembers } from "@/lib/groups/permissions";
export function GroupDashboard({
  groupId,
  role,
  userId,
  data,
  profile,
}: {
  groupId: string;
  role: string;
  userId: string;
  data: GroupDashboardData;
  profile?: ReactNode;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [eventOpen, setEventOpen] = useState(false);
  const tabs = ["Overview", "Events", "Members", "Comps", "Builds", "Announcements", "Settings"];
  const [openedAt] = useState(() => Date.now());
  const upcoming = data.events.filter(
    (e) => !e.cancelled && new Date(e.startsAt).getTime() > openedAt,
  );
  const editor = canEditShared(role),
    manager = canManageMembers(role);
  async function run(action: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/groups/${groupId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.path) setInviteLink(new URL(body.path, window.location.origin).href);
      if (body.left || body.deleted) {
        router.push("/groups");
        router.refresh();
      } else {
        if (action.action === "event") {
          setEventOpen(false);
          setTab("Events");
        }
        setMessage("Change saved.");
        router.refresh();
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save change");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p role="status" className="guild-save-status">
        {message}
      </p>
      <div className="guild-workspace-actions">
        <span>
          {data.memberCount.toLocaleString()} {data.memberCount === 1 ? "member" : "members"} · Your
          role: {role.toLowerCase()}
        </span>
        {editor && (
          <button type="button" className="button primary" onClick={() => setEventOpen(true)}>
            New event
          </button>
        )}
      </div>
      <nav className="guild-tabs" role="tablist" aria-label="Guild workspace">
        {tabs.map((name, i) => (
          <button
            type="button"
            role="tab"
            id={`guild-tab-${name}`}
            aria-controls="guild-tab-panel"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            key={name}
            onClick={() => setTab(name)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next =
                  tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
                setTab(next);
                document.getElementById(`guild-tab-${next}`)?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <div id="guild-tab-panel" role="tabpanel" aria-labelledby={`guild-tab-${tab}`}>
        {tab === "Overview" && (
          <div className="guild-activity-grid">
            <section className="guild-next-event">
              <span className="eyebrow">NEXT EVENT</span>
              {upcoming[0] ? (
                <>
                  <h2>{upcoming[0].title}</h2>
                  <p className="event-date">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "full",
                      timeStyle: "short",
                      timeZone: upcoming[0].timezone,
                    }).format(new Date(upcoming[0].startsAt))}
                    <small className="guild-event-timezone">{upcoming[0].timezone}</small>
                  </p>
                  <p>{upcoming[0].description}</p>
                  <div className="event-facts">
                    <span>{upcoming[0].expectedParticipants} expected players</span>
                    <span>
                      {upcoming[0].rsvps.filter((r) => r.status === "AVAILABLE").length} available
                    </span>
                  </div>
                  <button className="button secondary" onClick={() => setTab("Events")}>
                    View event & RSVP
                  </button>
                </>
              ) : (
                <>
                  <h2>Plan the next gathering.</h2>
                  <p>No upcoming event has been scheduled.</p>
                  {editor && (
                    <button className="button secondary" onClick={() => setEventOpen(true)}>
                      Schedule an event
                    </button>
                  )}
                </>
              )}
            </section>
            <section className="guild-recent-announcements">
              <div className="section-heading">
                <h2>Guild announcements</h2>
                <button className="button secondary" onClick={() => setTab("Announcements")}>
                  View all
                </button>
              </div>
              {data.announcements.slice(0, 3).map((a) => (
                <article key={a.id}>
                  <h3>{a.title}</h3>
                  <p>{a.body.slice(0, 240)}</p>
                </article>
              ))}
              {!data.announcements.length && <p>No announcements yet.</p>}
            </section>
            <section className="guild-quick-comps">
              <div className="section-heading">
                <h2>Shared comps</h2>
                <button className="button secondary" onClick={() => setTab("Comps")}>
                  Open comps
                </button>
              </div>
              {data.compositionPreviews.map((c) => (
                <Link
                  className="guild-composition-preview"
                  href={`/compositions/${c.id}`}
                  key={c.id}
                >
                  <span className="guild-composition-weapons" aria-label="Primary weapons">
                    {c.weapons.map((w, i) => (
                      <span key={i} title={`${w.role}: ${equipmentName(w.itemId)}`}>
                        <ItemIcon id={w.itemId} quality={w.quality} size={34} />
                      </span>
                    ))}
                  </span>
                  <span>
                    <strong>{c.title}</strong>
                    <small>
                      {c.playerCount === null
                        ? "Loadout details unavailable"
                        : `${c.playerCount} players`}
                    </small>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
              {!data.compositions.length && <p>No shared comps yet.</p>}
              <h2 className="guild-shared-builds-heading">Shared builds</h2>
              {data.builds.slice(0, 3).map((b) => (
                <button className="guild-build-preview" key={b.id} onClick={() => setTab("Builds")}>
                  <EquipmentStrip equipment={b.equipment} size={30} />
                  <strong>{b.title}</strong>
                </button>
              ))}
              {!data.builds.length && <p>No shared builds yet.</p>}
              <div className="guild-overview-shortcuts" aria-label="Guild quick actions">
                {editor && (
                  <button className="button secondary" onClick={() => setEventOpen(true)}>
                    Create event
                  </button>
                )}
                <button className="button secondary" onClick={() => setTab("Comps")}>
                  View comps
                </button>
                <button className="button secondary" onClick={() => setTab("Members")}>
                  View members
                </button>
              </div>
            </section>
            <section className="guild-upcoming">
              <h2>Upcoming activities</h2>
              {upcoming.slice(1, 4).map((e) => (
                <button className="guild-event-link" key={e.id} onClick={() => setTab("Events")}>
                  <strong>{e.title}</strong>
                  <span>
                    {new Date(e.startsAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </span>
                </button>
              ))}
              {upcoming.length < 2 && <p>No additional upcoming events.</p>}
              <button className="text-link" onClick={() => setTab("Members")}>
                View {data.memberCount.toLocaleString()}{" "}
                {data.memberCount === 1 ? "member" : "members"} →
              </button>
            </section>
          </div>
        )}
        {tab === "Events" && (
          <>
            {" "}
            <section className="panel guild-schedule" id="guild-events">
              <h2>Events & roster</h2>
              <p className="muted">
                Showing up to30 upcoming activities and20 recent past or cancelled events.
              </p>
              {data.events.map((e) => (
                <article className="group-announcement section" key={e.id}>
                  <h3>
                    {e.title}
                    {e.cancelled ? " · Cancelled" : ""}
                  </h3>
                  <p>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "full",
                      timeStyle: "short",
                      timeZone: e.timezone,
                    }).format(new Date(e.startsAt))}{" "}
                    ({e.timezone}) · {e.expectedParticipants} expected
                  </p>
                  <p className="preserve">{e.description}</p>
                  <p>Voice: {e.voiceInfo || "Not specified"}</p>
                  <a className="text-link" href={`/api/groups/${groupId}/events/${e.id}/calendar`}>
                    Export calendar event
                  </a>
                  {editor && !e.cancelled && <GroupEventEditor groupId={groupId} event={e} />}
                  {e.compositionId && (
                    <Link className="text-link" href={`/compositions/${e.compositionId}`}>
                      Assigned comp
                    </Link>
                  )}
                  <p className="muted">
                    RSVP: {e.rsvps.filter((r) => r.status === "AVAILABLE").length} available ·{" "}
                    {e.rsvps.filter((r) => r.status === "MAYBE").length} maybe
                  </p>
                  {e.rsvps.map((r) => (
                    <p key={r.userId}>
                      {r.name}: {r.status}
                      {r.role ? ` · ${r.role}` : ""}
                    </p>
                  ))}
                  {!e.cancelled && (
                    <form
                      className="market-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const f = new FormData(event.currentTarget);
                        run({
                          action: "rsvp",
                          eventId: e.id,
                          status: f.get("status"),
                          role: f.get("role"),
                        });
                      }}
                    >
                      <label>
                        Your response
                        <select
                          name="status"
                          aria-label={`RSVP for ${e.title}`}
                          defaultValue={
                            e.rsvps.find((r) => r.userId === userId)?.status || "AVAILABLE"
                          }
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="MAYBE">Maybe</option>
                          <option value="UNAVAILABLE">Unavailable</option>
                        </select>
                      </label>
                      <label>
                        Your role
                        <input
                          name="role"
                          maxLength={60}
                          defaultValue={e.rsvps.find((r) => r.userId === userId)?.role || ""}
                        />
                      </label>
                      <button className="button secondary" disabled={busy}>
                        Save RSVP
                      </button>
                    </form>
                  )}
                  {editor && !e.cancelled && (
                    <button
                      className="button secondary section"
                      disabled={busy}
                      onClick={() => run({ action: "cancel-event", eventId: e.id })}
                    >
                      Cancel event
                    </button>
                  )}
                </article>
              ))}
              {!data.events.length && (
                <p className="empty">
                  No events scheduled. Plan the next gathering with your guild.
                </p>
              )}
            </section>
          </>
        )}
        {tab === "Members" && (
          <>
            {" "}
            <section className="panel" id="guild-members">
              <h2>Members</h2>
              {data.memberCount > data.members.length && (
                <p className="muted">
                  Showing the first{data.members.length} of{data.memberCount} members. Full roster
                  pagination remains unavailable.
                </p>
              )}
              {data.members.map((m) => (
                <div className="group-member" key={m.userId}>
                  <span>
                    <b>{m.name}</b>
                    <small>{m.role}</small>
                  </span>
                  {role === "OWNER" && m.role !== "OWNER" && (
                    <>
                      <select
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        disabled={busy}
                        onChange={(e) =>
                          run({ action: "role", userId: m.userId, role: e.target.value })
                        }
                      >
                        {["ADMIN", "OFFICER", "MEMBER"].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Transfer ownership to ${m.name}? You will become an admin.`,
                            )
                          )
                            run({ action: "transfer", userId: m.userId });
                        }}
                      >
                        Transfer ownership to {m.name}
                      </button>
                    </>
                  )}
                  {manager && m.role !== "OWNER" && m.userId !== userId && (
                    <button
                      className="button secondary negative"
                      disabled={busy}
                      onClick={() => run({ action: "remove", userId: m.userId })}
                    >
                      Remove {m.name}
                    </button>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
        {tab === "Comps" && (
          <>
            {" "}
            <section className="panel" id="guild-compositions">
              <div className="section-heading">
                <h2>Shared comps</h2>
                {editor && (
                  <Link className="button secondary" href="/compositions/new">
                    Create comp
                  </Link>
                )}
              </div>
              {data.compositions.map((c) => (
                <p key={c.id}>
                  <Link className="text-link" href={`/compositions/${c.id}`}>
                    {c.title}
                  </Link>
                </p>
              ))}
              {!data.compositions.length && <p>No group comps yet.</p>}
            </section>
          </>
        )}
        {tab === "Builds" && (
          <>
            {" "}
            <section className="panel section">
              <h2>Shared build snapshots</h2>
              <p>
                Equipment and author notes are copied when shared. Later source edits do not
                silently replace the group snapshot.
              </p>
              {editor && (
                <form
                  className="market-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    run({ action: "share-build", buildId: f.get("buildId") });
                  }}
                >
                  <label>
                    Build to share
                    <select name="buildId" required aria-label="Build to share">
                      <option value="">Choose accessible build</option>
                      {data.availableBuilds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button secondary" disabled={busy}>
                    Share build snapshot
                  </button>
                </form>
              )}
              <div className="tool-grid section">
                {data.builds.map((b) => (
                  <article className="panel" key={b.id}>
                    <h3>{b.title}</h3>
                    <EquipmentStrip equipment={b.equipment} />
                    <ul className="equipment-summary">
                      {b.equipment.map((e) => (
                        <li key={e.slot}>
                          <strong>{e.slot}</strong>
                          <span>
                            {e.itemId} · Q{e.quality}
                          </span>
                          <small>{e.abilities}</small>
                        </li>
                      ))}
                    </ul>
                    {editor && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => run({ action: "remove-build", id: b.id })}
                      >
                        Remove build snapshot
                      </button>
                    )}
                  </article>
                ))}
              </div>
              {!data.builds.length && <p>No build snapshots yet.</p>}
            </section>
          </>
        )}
        {tab === "Announcements" && (
          <>
            {" "}
            <section className="panel section" id="guild-announcements">
              <h2>Announcements</h2>
              {editor && (
                <form
                  className="settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    if (
                      await run({
                        action: "announcement",
                        title: f.get("title"),
                        body: f.get("body"),
                      })
                    )
                      form.reset();
                  }}
                >
                  <label>
                    Announcement title
                    <input name="title" required minLength={3} maxLength={100} />
                  </label>
                  <label>
                    Announcement text
                    <textarea name="body" required maxLength={8000} />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Publish announcement
                  </button>
                </form>
              )}
              {data.announcements.map((a) => (
                <article className="group-announcement section" key={a.id}>
                  <h3>{a.title}</h3>
                  <p className="preserve">{a.body}</p>
                  {editor && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => run({ action: "remove-announcement", id: a.id })}
                    >
                      Remove announcement
                    </button>
                  )}
                </article>
              ))}
              {!data.announcements.length && <p>No announcements yet.</p>}
            </section>
          </>
        )}
        {tab === "Settings" && (
          <div className="guild-settings">
            <h2>Guild settings</h2>
            {profile}
            <section>
              {" "}
              {editor && (
                <>
                  <h2 className="section">Invite a member</h2>
                  <form
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run({ action: "invite", hours: Number(f.get("hours")) });
                    }}
                  >
                    <label>
                      Invitation expires in
                      <select name="hours" aria-label="Invitation expires in">
                        <option value="24">24 hours</option>
                        <option value="1">1 hour</option>
                        <option value="168">7 days</option>
                      </select>
                    </label>
                    <button className="button primary" disabled={busy}>
                      Create invitation
                    </button>
                  </form>
                  {inviteLink && (
                    <label className="section">
                      New single-use invitation link
                      <input aria-label="New invitation link" readOnly value={inviteLink} />
                      <small>
                        Share this link manually. It is shown only when created; Outpost sends no
                        external messages.
                      </small>
                    </label>
                  )}
                  <div className="section">
                    {data.invitations.map((i) => (
                      <div className="group-member" key={i.id}>
                        <span>
                          <small>Expires {i.expiresAt}</small>
                          <small>
                            {i.revokedAt ? "Revoked" : i.acceptedAt ? "Used" : "Unused"}
                          </small>
                        </span>
                        {!i.revokedAt && !i.acceptedAt && (
                          <button
                            className="button secondary"
                            disabled={busy}
                            aria-label={`Revoke invitation ${i.id}`}
                            onClick={() => run({ action: "revoke", invitationId: i.id })}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {manager && (
                <>
                  <h2 className="section">Membership requests</h2>
                  {!data.requests.length && <p>No pending requests.</p>}
                  {data.requests.map((r) => (
                    <div key={r.userId} className="group-member">
                      <span>
                        <b>{r.name}</b>
                        <small>{r.message}</small>
                      </span>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => run({ action: "decide", userId: r.userId, approve: true })}
                      >
                        Approve {r.name}
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => run({ action: "decide", userId: r.userId, approve: false })}
                      >
                        Reject {r.name}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </section>
            <section className="guild-danger-zone">
              <h3>Membership & ownership</h3>{" "}
              {role !== "OWNER" && (
                <button
                  className="button secondary section"
                  disabled={busy}
                  onClick={() => run({ action: "leave" })}
                >
                  Leave group
                </button>
              )}
              {role === "OWNER" && (
                <button
                  className="button secondary negative section"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this group, its shared comps, event records and announcements permanently?",
                      )
                    )
                      run({ action: "delete" });
                  }}
                >
                  Delete group
                </button>
              )}
            </section>
          </div>
        )}
      </div>
      <EditorDialog open={eventOpen} title="Create guild event" onClose={() => setEventOpen(false)}>
        {editor && (
          <form
            className="settings-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              if (
                await run({
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
            <div className="input-grid">
              <label>
                Event title
                <input name="title" required minLength={3} maxLength={100} />
              </label>
              <label>
                Start time (your device local time)
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label>
                Display timezone
                <input name="timezone" required defaultValue="Europe/Berlin" maxLength={80} />
              </label>
              <label>
                Expected participants
                <input
                  name="expectedParticipants"
                  type="number"
                  min={1}
                  max={400}
                  defaultValue={20}
                  required
                />
              </label>
              <label>
                Voice channel information
                <input name="voiceInfo" maxLength={200} />
              </label>
              <label>
                Assigned comp
                <select name="compositionId" aria-label="Assigned comp">
                  <option value="">No assigned comp</option>
                  {data.compositions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Event description
              <textarea name="description" maxLength={4000} />
            </label>
            <button className="button primary" disabled={busy}>
              Schedule event
            </button>
          </form>
        )}
      </EditorDialog>
    </>
  );
}
export function GroupRequest({ groupId }: { groupId: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="panel settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          const response = await fetch(`/api/groups/${groupId}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request", message: f.get("message") }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          setMessage("Membership request saved. An owner or admin must approve it.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Could not submit request");
        }
      }}
    >
      <label>
        Message to group leaders
        <textarea name="message" maxLength={1000} />
      </label>
      <button className="button primary">Request membership</button>
      <p role="status" className="guild-save-status">
        {message}
      </p>
    </form>
  );
}
