"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import type { TeamContext } from "./group-dashboard";
import { plural, roleLabel } from "./group-parts";
import styles from "./teams.module.css";

type Member = GroupDashboardData["members"][number];

/** A member as a well row: initial, name and role chip; actions on the right when allowed. */
export function MemberRow({ member, children }: { member: Member; children?: React.ReactNode }) {
  return (
    <div className={`well ${styles.wellRow}`} data-team-member="">
      <span className={styles.initial} aria-hidden="true">
        {member.name.slice(0, 1).toUpperCase()}
      </span>
      <span className={styles.rowCopy}>
        <strong>{member.name}</strong>
      </span>
      <span className="landing-chip is-muted" data-role={member.role}>
        {roleLabel(member.role)}
      </span>
      {children && <span className={styles.rowTools}>{children}</span>}
    </div>
  );
}

/** The roster: search, then each member with the role, ownership and removal controls. */
export function GroupMembers({ ctx }: { ctx: TeamContext }) {
  const { data, role, userId, manager, busy, run } = ctx;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const roster = data.members.filter((m) =>
    `${m.name} ${m.role}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(roster.length / 25));
  const current = Math.min(page, pages);
  const rows = roster.slice((current - 1) * 25, current * 25);
  return (
    <section className={`panel ${styles.panel}`} id="guild-members" aria-labelledby="team-members">
      <PanelHead
        id="team-members"
        emblem="team-roles"
        title="Members"
        line={`${plural(data.memberCount, "member")} · owners and admins manage roles`}
      />
      <label className={styles.search}>
        <span className="sr-only">Find a member</span>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          aria-label="Find a member"
          value={query}
          maxLength={80}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Find a member by name or role"
        />
      </label>
      {data.memberCount > data.members.length && (
        <StatusLine>
          Showing the first {data.members.length.toLocaleString("en")} of{" "}
          {data.memberCount.toLocaleString("en")} members.
        </StatusLine>
      )}
      {roster.length ? (
        <ul className={styles.list}>
          {rows.map((m) => (
            <li key={m.userId}>
              <MemberRow member={m}>
                {role === "OWNER" && m.role !== "OWNER" && (
                  <>
                    <WellSelect
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        run({ action: "role", userId: m.userId, role: e.target.value })
                      }
                    >
                      {["ADMIN", "OFFICER", "MEMBER"].map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </WellSelect>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      aria-label={`Transfer ownership to ${m.name}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Transfer ownership to ${m.name}? You will become an admin.`,
                          )
                        )
                          run({ action: "transfer", userId: m.userId });
                      }}
                    >
                      Make owner
                    </button>
                  </>
                )}
                {manager && m.role !== "OWNER" && m.userId !== userId && (
                  <button
                    type="button"
                    className={`button secondary ${styles.lossButton}`}
                    disabled={busy}
                    aria-label={`Remove ${m.name}`}
                    onClick={() => run({ action: "remove", userId: m.userId })}
                  >
                    Remove
                  </button>
                )}
              </MemberRow>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyWell
          title="No loaded members match that search."
          line="Search by name or by role, such as officer."
          action={
            <button type="button" className="button secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          }
        />
      )}
      {pages > 1 && (
        <nav className={styles.pager} aria-label="Member pages">
          <button
            type="button"
            className="pill-link is-small"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <span>
            {current} of {pages}
          </span>
          <button
            type="button"
            className="pill-link is-small"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
