"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
import { Pagination } from "./pagination";
import { WellSelect } from "./well-select";
import { SearchInput } from "./field";
import type { TeamContext } from "./group-dashboard";
import { plural, roleLabel } from "./group-parts";
import { AvatarFrame } from "./avatar-frame";
import styles from "./teams.module.css";

type Member = GroupDashboardData["members"][number];

/** A member as a well row: framed initial, name and role; the role control replaces the chip when allowed. */
export function MemberRow({
  member,
  editable = false,
  children,
}: {
  member: Member;
  editable?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`well ${styles.wellRow}`} data-team-member="">
      <AvatarFrame frame={member.avatarFrame} size={36} name={member.name} />
      <span className={styles.rowCopy}>
        <strong>{member.name}</strong>
      </span>
      {editable ? (
        <span className={styles.rowTools}>{children}</span>
      ) : (
        <span className="landing-chip is-muted" data-role={member.role}>
          {roleLabel(member.role)}
        </span>
      )}
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
      <label>
        <span className="sr-only">Find a member</span>
        <SearchInput
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
        <ul className={`${styles.list} ${styles.memberGrid}`}>
          {rows.map((m) => (
            <li key={m.userId}>
              <MemberRow
                member={m}
                editable={
                  m.role !== "OWNER" && (role === "OWNER" || (manager && m.userId !== userId))
                }
              >
                {role === "OWNER" && m.role !== "OWNER" && (
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
                )}
                {/* The rare and destructive actions wait behind the row's menu */}
                <RowMenu label={`More actions for ${m.name}`}>
                  {role === "OWNER" && m.role !== "OWNER" && (
                    <button
                      type="button"
                      role="menuitem"
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
                  )}
                  {manager && m.role !== "OWNER" && m.userId !== userId && (
                    <button
                      type="button"
                      role="menuitem"
                      data-tone="loss"
                      disabled={busy}
                      aria-label={`Remove ${m.name}`}
                      onClick={() => run({ action: "remove", userId: m.userId })}
                    >
                      Remove from team
                    </button>
                  )}
                </RowMenu>
              </MemberRow>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyWell
          emblem="team-roles"
          title="No loaded members match that search."
          line="Search by name or by role, such as officer."
          action={
            <button type="button" className="button secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          }
        />
      )}
      <Pagination label="Member pages" page={current} pages={pages} onPage={setPage} />
    </section>
  );
}

/** A ⋯ button with the row's less common actions; Escape or a click elsewhere closes it. */
function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !ref.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <span className={styles.rowMenu} ref={ref}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <span role="menu" onClick={() => setOpen(false)}>
          {children}
        </span>
      )}
    </span>
  );
}
