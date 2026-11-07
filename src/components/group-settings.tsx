"use client";
import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import Link from "@/components/link";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import { StatusLine } from "./status-line";
import type { TeamContext } from "./group-dashboard";
import { Field } from "./group-parts";
import { AvatarFrame } from "./avatar-frame";
import { GroupRoles } from "./group-roles";
import styles from "./teams.module.css";

const utc = (iso: string) =>
  `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;

/** Profile, roles, join requests and invitations, then leaving or deleting the team. */
export function GroupSettings({
  ctx,
  inviteLink,
  profile,
}: {
  ctx: TeamContext;
  inviteLink: string;
  profile?: ReactNode;
}) {
  const { data, access, busy, run } = ctx;
  const owner = access.owner;
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.settings}>
      <h2 className="sr-only">Team settings</h2>
      {/* The profile full width, then two stacks at their own heights: who wants in; invitations */}
      {profile && <div className={styles.settingsWide}>{profile}</div>}
      <div className={styles.settingsWide}>
        <GroupRoles ctx={ctx} />
      </div>
      <div className={styles.overviewColumn}>
        {ctx.can("manageRequests") && (
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
                    <AvatarFrame frame={r.avatarFrame} size={36} name={r.name} />
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
                emblem="team-roles"
                title="No pending requests"
                line="New requests from players outside the team show up here."
                action={
                  <Link className="button secondary" href="/groups">
                    See the directory
                  </Link>
                }
              />
            )}
          </section>
        )}
      </div>
      <div className={styles.overviewColumn}>
        {(ctx.can("inviteMembers") || ctx.can("manageRequests")) && (
          <section className={`panel ${styles.panel}`} aria-labelledby="team-invites">
            <PanelHead
              id="team-invites"
              title="Invite a member"
              line="A single-use link that joins one player with the role new members get. Outpost sends nothing for you; share it yourself."
            />
            <form
              hidden={!ctx.can("inviteMembers")}
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
            {ctx.can("inviteMembers") ? null : (
              <StatusLine>
                You can revoke links here; creating them needs Invite members.
              </StatusLine>
            )}
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
      </div>
      <section className={`panel ${styles.panel} ${styles.danger}`} aria-labelledby="team-leave">
        <PanelHead
          id="team-leave"
          title={owner ? "Delete this team" : "Leave this team"}
          line={
            owner
              ? "Removes its shared comps, events and announcements for everyone. Hand the team to another member first to keep it."
              : "You lose access to its events, comps and loot splits until you are invited again."
          }
          actions={
            owner ? (
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
