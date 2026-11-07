"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
import { Pagination } from "./pagination";
import { EditorDialog } from "./editor-dialog";
import { MemberRolesEditor, RoleChips } from "./group-roles";
import { SearchInput } from "./field";
import type { TeamContext } from "./group-dashboard";
import { plural } from "./group-parts";
import { AvatarFrame } from "./avatar-frame";
import styles from "./teams.module.css";

type Member = GroupDashboardData["members"][number];

/** A member as a well row: framed initial, name and role chips; tools at the end when allowed. */
export function MemberRow({
  member,
  roles,
  children,
}: {
  member: Member;
  roles: GroupDashboardData["roles"];
  children?: React.ReactNode;
}) {
  return (
    <div className={`well ${styles.wellRow}`} data-team-member="">
      <AvatarFrame frame={member.avatarFrame} size={36} name={member.name} />
      <span className={styles.rowCopy}>
        <strong>{member.name}</strong>
        <RoleChips roles={roles} held={member.roleIds} owner={member.owner} />
      </span>
      {children && <span className={styles.rowTools}>{children}</span>}
    </div>
  );
}

/** The roster: search, then each member with their roles and the role, ownership and removal controls. */
export function GroupMembers({ ctx }: { ctx: TeamContext }) {
  const { data, access, userId, busy, run } = ctx;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState<Member | null>(null);
  const roleNames = (m: Member) =>
    data.roles
      .filter((r) => m.roleIds.includes(r.id))
      .map((r) => r.name)
      .join(" ");
  const roster = data.members.filter((m) =>
    `${m.name} ${m.owner ? "Leader" : ""} ${roleNames(m)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(roster.length / 25));
  const current = Math.min(page, pages);
  const rows = roster.slice((current - 1) * 25, current * 25);
  const outranks = (m: Member) => access.owner || m.rank < access.rank;
  return (
    <section className={`panel ${styles.panel}`} id="guild-members" aria-labelledby="team-members">
      <PanelHead
        id="team-members"
        emblem="team-roles"
        title="Members"
        line={`${plural(data.memberCount, "member")} · roles set what each one can do`}
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
          {rows.map((m) => {
            const assign = ctx.can("manageRoles") && !m.owner;
            const assignable = assign && (m.userId === userId || outranks(m));
            const removable =
              ctx.can("removeMembers") && !m.owner && m.userId !== userId && outranks(m);
            const transferable = access.owner && !m.owner;
            return (
              <li key={m.userId}>
                <MemberRow member={m} roles={data.roles}>
                  {assign && (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy || !assignable}
                      title={assignable ? undefined : "Only members below you"}
                      aria-label={`Roles for ${m.name}`}
                      onClick={() => setAssigning(m)}
                    >
                      Roles
                    </button>
                  )}
                  {/* The rare and destructive actions wait behind the row's menu */}
                  {(transferable || removable) && (
                    <RowMenu label={`More actions for ${m.name}`}>
                      {transferable && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={busy}
                          aria-label={`Transfer ownership to ${m.name}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Transfer ownership to ${m.name}? You keep the team's highest role.`,
                              )
                            )
                              run({ action: "transfer", userId: m.userId });
                          }}
                        >
                          Make owner
                        </button>
                      )}
                      {removable && (
                        <button
                          type="button"
                          role="menuitem"
                          data-tone="loss"
                          disabled={busy}
                          aria-label={`Remove ${m.name}`}
                          onClick={() => {
                            if (window.confirm(`Remove ${m.name} from the team?`))
                              run({ action: "remove", userId: m.userId });
                          }}
                        >
                          Remove from team
                        </button>
                      )}
                    </RowMenu>
                  )}
                </MemberRow>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyWell
          emblem="team-roles"
          title="No loaded members match that search."
          line="Search by name or by role, such as Officer."
          action={
            <button type="button" className="button secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          }
        />
      )}
      <Pagination label="Member pages" page={current} pages={pages} onPage={setPage} />
      <EditorDialog
        open={assigning !== null}
        title={`Roles for ${assigning?.name ?? "member"}`}
        onClose={() => setAssigning(null)}
      >
        {assigning && (
          <MemberRolesEditor ctx={ctx} member={assigning} onDone={() => setAssigning(null)} />
        )}
      </EditorDialog>
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
