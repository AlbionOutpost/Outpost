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
import { GroupJoining, GroupLeave } from "./group-settings";
import roleStyles from "./group-roles.module.css";
import styles from "./teams.module.css";

type Member = GroupDashboardData["members"][number];

const joined = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

/**
 * A member as a compact well row for the overview's rail: their Discord picture in their frame
 * (the server sends pictures only to members), name and role chips in the roles' colours.
 */
export function MemberRow({
  member,
  roles,
  self,
}: {
  member: Member;
  roles: GroupDashboardData["roles"];
  /** The signed-in viewer's own row. */
  self?: boolean;
}) {
  return (
    <div className={`well ${styles.wellRow} ${styles.memberRow}`} data-team-member="">
      <AvatarFrame frame={member.avatarFrame} size={36} image={member.image} name={member.name} />
      <span className={styles.rowCopy}>
        <strong>
          {member.name}
          {self && <span className={styles.youTag}>You</span>}
        </strong>
        <RoleChips roles={roles} held={member.roleIds} owner={member.owner} />
      </span>
    </div>
  );
}

/** The role a row is tinted by: gold for the Leader, else the highest role held. */
function topRole(member: Member, roles: GroupDashboardData["roles"]) {
  if (member.owner) return { key: "leader", color: "gold" };
  const role = roles.find((r) => member.roleIds.includes(r.id));
  return role ? { key: role.id, color: role.color } : { key: "none", color: "muted" };
}

/**
 * The Members tab: the roster as one table that uses the width (picture in its frame, name,
 * roles, joined, and the role, ownership and removal controls for those allowed), filtered by
 * role or searched; then who wants in (requests, invitations) and leaving.
 */
export function GroupMembers({ ctx, inviteLink }: { ctx: TeamContext; inviteLink: string }) {
  const { data, access, userId, busy, run } = ctx;
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState<Member | null>(null);
  const roleNames = (m: Member) =>
    data.roles
      .filter((r) => m.roleIds.includes(r.id))
      .map((r) => r.name)
      .join(" ");
  const holds = (m: Member, key: string) =>
    key === "all" ||
    (key === "leader"
      ? m.owner
      : key === "none"
        ? !m.owner && !m.roleIds.length
        : m.roleIds.includes(key));
  // One filter per role that anyone in the loaded roster holds, with its count
  const filters = [
    { key: "all", name: "Everyone", color: undefined as string | undefined },
    { key: "leader", name: "Leader", color: "gold" },
    ...data.roles.map((r) => ({ key: r.id, name: r.name, color: r.color })),
    { key: "none", name: "No role", color: "muted" },
  ]
    .map((f) => ({ ...f, count: data.members.filter((m) => holds(m, f.key)).length }))
    .filter((f) => f.key === "all" || f.count > 0);
  const roster = data.members.filter(
    (m) =>
      holds(m, role) &&
      `${m.name} ${m.owner ? "Leader" : ""} ${roleNames(m)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(roster.length / 25));
  const current = Math.min(page, pages);
  const rows = roster.slice((current - 1) * 25, current * 25);
  const outranks = (m: Member) => access.owner || m.rank < access.rank;
  const manages = ctx.can("manageRoles") || ctx.can("removeMembers") || access.owner;
  return (
    <div className={styles.membersTab}>
      <section
        className={`panel ${styles.panel}`}
        id="guild-members"
        aria-labelledby="team-members-heading"
      >
        <PanelHead
          id="team-members-heading"
          emblem="team-roles"
          title="Members"
          line={`${plural(data.memberCount, "member")} · roles set what each one can do`}
          actions={
            <label className={styles.rosterSearch}>
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
                placeholder="Find by name or role"
              />
            </label>
          }
        />
        {filters.length > 2 && (
          <div className={styles.roleFilter} role="group" aria-label="Show members by role">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={role === f.key}
                className={f.color ? `${roleStyles.chip} ${roleStyles.tone}` : roleStyles.chip}
                data-role-color={f.color}
                data-all={f.color ? undefined : ""}
                onClick={() => {
                  setRole(f.key);
                  setPage(1);
                }}
              >
                <span>{f.name}</span> <b>{f.count.toLocaleString("en")}</b>
              </button>
            ))}
          </div>
        )}
        {data.memberCount > data.members.length && (
          <StatusLine>
            Showing the first {data.members.length.toLocaleString("en")} of{" "}
            {data.memberCount.toLocaleString("en")} members.
          </StatusLine>
        )}
        {roster.length ? (
          <div className="table-scroll">
            <table className={styles.roster}>
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Roles</th>
                  <th scope="col">Joined</th>
                  {manages && (
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const assign = ctx.can("manageRoles") && !m.owner;
                  const assignable = assign && (m.userId === userId || outranks(m));
                  const removable =
                    ctx.can("removeMembers") && !m.owner && m.userId !== userId && outranks(m);
                  const transferable = access.owner && !m.owner;
                  const self = m.userId === userId;
                  return (
                    <tr
                      key={m.userId}
                      className={roleStyles.tone}
                      data-role-color={topRole(m, data.roles).color}
                      data-team-member=""
                    >
                      <th scope="row">
                        <span className={styles.rosterName}>
                          <AvatarFrame
                            frame={m.avatarFrame}
                            size={44}
                            image={m.image}
                            name={m.name}
                          />
                          <strong>{m.name}</strong>
                          {self && <span className={styles.youTag}>You</span>}
                        </span>
                      </th>
                      <td>
                        <RoleChips roles={data.roles} held={m.roleIds} owner={m.owner} />
                      </td>
                      <td className={styles.joined}>
                        <time dateTime={m.joinedAt}>{joined(m.joinedAt)}</time>
                      </td>
                      {manages && (
                        <td>
                          <span className={styles.rowTools}>
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
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyWell
            emblem="team-roles"
            title="No loaded members match that search."
            line="Search by name or by role, such as Officer."
            action={
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setQuery("");
                  setRole("all");
                }}
              >
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
          className={styles.dialog}
        >
          {assigning && (
            <MemberRolesEditor ctx={ctx} member={assigning} onDone={() => setAssigning(null)} />
          )}
        </EditorDialog>
      </section>
      <GroupJoining ctx={ctx} inviteLink={inviteLink} />
      <GroupLeave ctx={ctx} />
    </div>
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
