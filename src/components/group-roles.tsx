"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import {
  maxTeamRoles,
  roleColors,
  teamPermissions,
  type TeamPermission,
} from "@/lib/groups/permissions";
import { PanelHead } from "./panel-head";
import { EditorDialog } from "./editor-dialog";
import { StatusLine } from "./status-line";
import type { TeamContext } from "./group-dashboard";
import { Field, plural } from "./group-parts";
import styles from "./teams.module.css";
import own from "./group-roles.module.css";

type Role = GroupDashboardData["roles"][number];
export const belowYours = "Only roles below yours";

/** A member's roles as small coloured chips, highest first. */
export function RoleChips({
  roles,
  held,
  owner,
}: {
  roles: Role[];
  held: string[];
  owner: boolean;
}) {
  const shown = roles.filter((r) => held.includes(r.id));
  return (
    <span className={own.chips}>
      {owner && (
        <span className={`${own.chip} ${own.tone}`} data-role-color="gold">
          <span>Leader</span>
        </span>
      )}
      {shown.map((r) => (
        <span key={r.id} className={`${own.chip} ${own.tone}`} data-role-color={r.color}>
          <span>{r.name}</span>
        </span>
      ))}
      {!owner && !shown.length && (
        <span className={own.chip}>
          <span>No role</span>
        </span>
      )}
    </span>
  );
}

/**
 * Settings → Roles: the Leader on top, then the team's roles highest first. Members with
 * Manage roles reorder, edit and delete the roles below their own; the server checks again.
 */
export function GroupRoles({ ctx }: { ctx: TeamContext }) {
  const { data, access, busy, run } = ctx;
  const manage = ctx.can("manageRoles");
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const below = (r: Role) => access.owner || r.position < access.rank;
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="team-roles">
      <PanelHead
        id="team-roles"
        title="Roles"
        line="Highest first. A member gets every permission of each role they hold."
        actions={
          manage ? (
            <button
              type="button"
              className="button secondary"
              disabled={busy || data.roles.length >= maxTeamRoles}
              onClick={() => setEditing("new")}
            >
              <Plus size={16} aria-hidden="true" /> New role
            </button>
          ) : undefined
        }
      />
      {manage && data.roles.length >= maxTeamRoles && (
        <StatusLine>
          A team can have up to {maxTeamRoles} roles. Delete one to add another.
        </StatusLine>
      )}
      <ol className={styles.list} aria-label="Team roles, highest first">
        <li className={`well ${styles.wellRow}`}>
          <span
            className={`${own.roleDot} ${own.tone}`}
            data-role-color="gold"
            aria-hidden="true"
          />
          <span className={styles.rowCopy}>
            <strong>Leader</strong>
            <small className={styles.wrap}>
              The owner. Every permission; hand it over with Make owner.
            </small>
          </span>
        </li>
        {data.roles.map((r, i) => {
          const editable = manage && below(r);
          const canUp = editable && i > 0 && below(data.roles[i - 1]);
          const canDown = editable && i < data.roles.length - 1;
          return (
            <li
              key={r.id}
              className={`well ${styles.wellRow} ${own.roleRow}`}
              data-team-role={r.name}
            >
              <span
                className={`${own.roleDot} ${own.tone}`}
                data-role-color={r.color}
                aria-hidden="true"
              />
              <span className={styles.rowCopy}>
                <strong>{r.name}</strong>
                <small className={styles.wrap}>
                  {plural(r.members, "member")} · {plural(r.permissions.length, "permission")}
                  {r.isDefault ? " · given to new members" : ""}
                  {manage && !editable ? ` · ${belowYours}` : ""}
                </small>
              </span>
              {manage && (
                <span className={styles.rowTools}>
                  <span className={own.order}>
                    <button
                      type="button"
                      aria-label={`Move ${r.name} up`}
                      title={
                        canUp
                          ? undefined
                          : editable
                            ? "Already directly below your role"
                            : belowYours
                      }
                      disabled={busy || !canUp}
                      onClick={() => run({ action: "role-move", roleId: r.id, direction: "up" })}
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${r.name} down`}
                      title={
                        canDown ? undefined : editable ? "Already the lowest role" : belowYours
                      }
                      disabled={busy || !canDown}
                      onClick={() => run({ action: "role-move", roleId: r.id, direction: "down" })}
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                  </span>
                  <button
                    type="button"
                    className="button secondary"
                    aria-label={`Edit role ${r.name}`}
                    title={editable ? undefined : belowYours}
                    disabled={busy || !editable}
                    onClick={() => setEditing(r)}
                  >
                    Edit
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <EditorDialog
        open={editing !== null}
        title={editing === "new" ? "New role" : `Edit ${editing?.name ?? "role"}`}
        onClose={() => setEditing(null)}
        className={styles.dialog}
      >
        {editing !== null && (
          <RoleEditor
            ctx={ctx}
            role={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </EditorDialog>
    </section>
  );
}

function RoleEditor({
  ctx,
  role,
  onDone,
}: {
  ctx: TeamContext;
  role: Role | null;
  onDone: () => void;
}) {
  const { access, busy, run } = ctx;
  const [color, setColor] = useState(role?.color ?? "muted");
  // Nobody can grant or take away a permission they do not hold themselves.
  const holds = (key: TeamPermission) => access.owner || access.permissions.includes(key);
  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const body = {
          name: String(f.get("name") || "").trim(),
          color,
          permissions: f.getAll("permission").map(String),
        };
        const saved = await run(
          role
            ? { action: "role-update", roleId: role.id, ...body }
            : { action: "role-create", ...body },
        );
        if (saved) onDone();
      }}
    >
      <Field label="Name" hint="Up to 32 characters, such as Caller or Healer lead.">
        <input
          name="name"
          required
          maxLength={32}
          defaultValue={role?.name ?? ""}
          autoComplete="off"
        />
      </Field>
      <fieldset className={own.colorField}>
        <legend>Colour</legend>
        <div className="segmented">
          {roleColors.map((c) => (
            <label key={c}>
              <input
                type="radio"
                name="color"
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
              />
              <span
                className={`${own.roleDot} ${own.tone}`}
                data-role-color={c}
                aria-hidden="true"
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={own.permissions}>
        <legend>Permissions</legend>
        {teamPermissions.map((p) => (
          <label key={p.key} className={`well ${styles.recruitToggle}`}>
            <input
              type="checkbox"
              name="permission"
              value={p.key}
              defaultChecked={role?.permissions.includes(p.key) ?? false}
              disabled={!holds(p.key)}
            />
            <span>
              <strong>{p.label}</strong>
              <small>
                {holds(p.key)
                  ? p.line
                  : `${p.line} You don't have this permission, so you can't change it.`}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      {/* A disabled box is not submitted: keep what the role already had */}
      {role?.permissions
        .filter((key) => !holds(key as TeamPermission))
        .map((key) => (
          <input key={key} type="hidden" name="permission" value={key} />
        ))}
      <div className={own.editorActions}>
        <span>
          {role && !role.isDefault && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                if (await run({ action: "role-default", roleId: role.id })) onDone();
              }}
            >
              Give to new members
            </button>
          )}
          {role && (
            <button
              type="button"
              className={`button secondary ${styles.lossButton}`}
              disabled={busy || role.isDefault}
              title={role.isDefault ? "Give another role to new members first" : undefined}
              onClick={async () => {
                if (
                  window.confirm(
                    `Delete the ${role.name} role? ${plural(role.members, "member")} lose it and its permissions.`,
                  ) &&
                  (await run({ action: "role-delete", roleId: role.id }))
                )
                  onDone();
              }}
            >
              Delete role
            </button>
          )}
        </span>
        <button className="button primary" disabled={busy}>
          {role ? "Save role" : "Create role"}
        </button>
      </div>
      {role?.isDefault && (
        <StatusLine>
          New members get this role. Give another role to new members before deleting it.
        </StatusLine>
      )}
    </form>
  );
}

/** Which roles a member holds; only roles below the editor's own can change. */
export function MemberRolesEditor({
  ctx,
  member,
  onDone,
}: {
  ctx: TeamContext;
  member: GroupDashboardData["members"][number];
  onDone: () => void;
}) {
  const { data, access, busy, run } = ctx;
  const below = (r: Role) => access.owner || r.position < access.rank;
  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (
          await run({
            action: "member-roles",
            userId: member.userId,
            roleIds: f.getAll("role").map(String),
          })
        )
          onDone();
      }}
    >
      <fieldset className={`${own.permissions} ${own.assign}`}>
        <legend>Roles they hold</legend>
        {data.roles.map((r) => (
          <label key={r.id} className={`well ${styles.recruitToggle}`}>
            <input
              type="checkbox"
              name="role"
              value={r.id}
              defaultChecked={member.roleIds.includes(r.id)}
              disabled={!below(r)}
            />
            <span>
              <strong>
                <span className={`${own.chip} ${own.tone}`} data-role-color={r.color}>
                  <span>{r.name}</span>
                </span>
              </strong>
              <small>{below(r) ? plural(r.permissions.length, "permission") : belowYours}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {/* Roles at or above yours stay as they are: send them unchanged */}
      {data.roles
        .filter((r) => !below(r) && member.roleIds.includes(r.id))
        .map((r) => (
          <input key={r.id} type="hidden" name="role" value={r.id} />
        ))}
      <div className={own.editorActions}>
        <span />
        <button className="button primary" disabled={busy}>
          Save roles
        </button>
      </div>
    </form>
  );
}
