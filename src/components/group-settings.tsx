"use client";
import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import type { TeamContext } from "./group-dashboard";
import { Field } from "./group-parts";
import styles from "./teams.module.css";

const utc = (iso: string) =>
  `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;

/** Profile, invitations, join requests, then leaving or deleting the team. */
export function GroupSettings({
  ctx,
  inviteLink,
  profile,
}: {
  ctx: TeamContext;
  inviteLink: string;
  profile?: ReactNode;
}) {
  const { data, role, editor, manager, busy, run } = ctx;
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.settings}>
      <h2 className="sr-only">Team settings</h2>
      {profile}
      {editor && (
        <section className={`panel ${styles.panel}`} aria-labelledby="team-invites">
          <PanelHead
            id="team-invites"
            emblem="team-roles"
            title="Invite a member"
            line="A single-use link that joins one player as a Member. Outpost sends nothing for you; share it yourself."
          />
          <form
            className={styles.inlineForm}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setCopied(false);
              run({ action: "invite", hours: Number(f.get("hours")) });
            }}
          >
            <Field label="Invitation expires in">
              <WellSelect name="hours" aria-label="Invitation expires in" defaultValue="24">
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
              </WellSelect>
            </Field>
            <button className="button primary" disabled={busy}>
              Create invitation
            </button>
          </form>
          {inviteLink && (
            <div className={styles.inviteLink}>
              <Field label="New single-use invitation link" hint="Shown once. Copy it now.">
                <input aria-label="New invitation link" readOnly value={inviteLink} />
              </Field>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  navigator.clipboard?.writeText(inviteLink).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  )
                }
              >
                {copied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          )}
          {data.invitations.length > 0 && (
            <ul className={styles.list} aria-label="Invitations">
              {data.invitations.map((i) => {
                const state = i.revokedAt ? "Revoked" : i.acceptedAt ? "Used" : "Open";
                return (
                  <li key={i.id} className={`well ${styles.wellRow}`}>
                    <span className={styles.rowCopy}>
                      <strong>Invitation link</strong>
                      <small>
                        Expires <time dateTime={i.expiresAt}>{utc(i.expiresAt)}</time>
                      </small>
                    </span>
                    <span className={state === "Open" ? "landing-chip" : "landing-chip is-muted"}>
                      {state}
                    </span>
                    {state === "Open" && (
                      <span className={styles.rowTools}>
                        <button
                          type="button"
                          className={`button secondary ${styles.lossButton}`}
                          disabled={busy}
                          aria-label={`Revoke invitation ${i.id}`}
                          onClick={() => run({ action: "revoke", invitationId: i.id })}
                        >
                          Revoke
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      {manager && (
        <section className={`panel ${styles.panel}`} aria-labelledby="team-requests">
          <PanelHead
            id="team-requests"
            title="Membership requests"
            line="Players who asked to join this public team."
          />
          {data.requests.length ? (
            <ul className={styles.list}>
              {data.requests.map((r) => (
                <li key={r.userId} className={`well ${styles.wellRow}`}>
                  <span className={styles.initial} aria-hidden="true">
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.rowCopy}>
                    <strong>{r.name}</strong>
                    {r.message && <small className={styles.wrap}>{r.message}</small>}
                  </span>
                  <span className={styles.rowTools}>
                    <button
                      type="button"
                      className="button primary"
                      disabled={busy}
                      aria-label={`Approve ${r.name}`}
                      onClick={() => run({ action: "decide", userId: r.userId, approve: true })}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      aria-label={`Reject ${r.name}`}
                      onClick={() => run({ action: "decide", userId: r.userId, approve: false })}
                    >
                      Reject
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyWell
              title="No pending requests"
              line="New requests from public players show up here."
            />
          )}
        </section>
      )}
      <section className={`panel ${styles.panel} ${styles.danger}`} aria-labelledby="team-leave">
        <PanelHead
          id="team-leave"
          title={role === "OWNER" ? "Delete this team" : "Leave this team"}
          line={
            role === "OWNER"
              ? "Removes its shared comps, events and announcements for everyone. Hand the team to another member first to keep it."
              : "You lose access to its events, comps and loot splits until you are invited again."
          }
          actions={
            role === "OWNER" ? (
              <button
                type="button"
                className={`button secondary ${styles.lossButton}`}
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this team, its shared comps, events and announcements for everyone?",
                    )
                  )
                    run({ action: "delete" });
                }}
              >
                Delete team
              </button>
            ) : (
              <button
                type="button"
                className={`button secondary ${styles.lossButton}`}
                disabled={busy}
                onClick={() => run({ action: "leave" })}
              >
                Leave team
              </button>
            )
          }
        />
      </section>
    </div>
  );
}
