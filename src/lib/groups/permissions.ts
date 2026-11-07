/**
 * Team roles, Discord style. Each team keeps its own ordered roles with permission flags; a
 * member's rights are the union of the roles they hold, and the owner (the Leader) has every
 * right and sits above every role. The server resolves this from current rows on every request
 * (`loadTeamAccess` in ./roles); nothing here trusts a role the browser sent.
 */
export const teamPermissions = [
  {
    key: "manageTeam",
    label: "Manage team",
    line: "Edit the name, description, crest, activities, recruiting and visibility, and delete anyone's shared comp.",
  },
  {
    key: "manageRoles",
    label: "Manage roles",
    line: "Create, edit, order and hand out roles below their own highest role.",
  },
  {
    key: "inviteMembers",
    label: "Invite members",
    line: "Create single-use invitation links and revoke their own.",
  },
  {
    key: "manageRequests",
    label: "Review requests",
    line: "Approve or reject join requests and revoke anyone's invitation link.",
  },
  {
    key: "removeMembers",
    label: "Remove members",
    line: "Remove members whose highest role is below theirs.",
  },
  {
    key: "manageEvents",
    label: "Manage events",
    line: "Schedule, edit and cancel events, and post or remove announcements.",
  },
  {
    key: "manageComps",
    label: "Manage comps",
    line: "Save and edit the team's shared comps, and delete their own.",
  },
  {
    key: "manageLoot",
    label: "Manage loot splits",
    line: "Create and edit the team's loot splits.",
  },
  {
    key: "manageBuilds",
    label: "Share builds",
    line: "Share builds with the team and remove shared ones.",
  },
] as const;
export type TeamPermission = (typeof teamPermissions)[number]["key"];
export const permissionKeys = teamPermissions.map((p) => p.key) as TeamPermission[];
const bit = (key: TeamPermission) => 1 << permissionKeys.indexOf(key);
export const allPermissions = (1 << permissionKeys.length) - 1;

export function toMask(keys: readonly string[]) {
  return keys.reduce(
    (mask, key) =>
      mask | (permissionKeys.includes(key as TeamPermission) ? bit(key as TeamPermission) : 0),
    0,
  );
}
export function fromMask(mask: number) {
  return permissionKeys.filter((key) => mask & bit(key));
}

/** Role colours: a fixed list of design tokens, so a stored colour can never inject a style. */
export const roleColors = [
  "muted",
  "ember",
  "gold",
  "green",
  "teal",
  "blue",
  "violet",
  "red",
] as const;
export type RoleColor = (typeof roleColors)[number];

/** The roles a team starts with, and what existing teams were given from the old fixed roles. */
export const seededRoles = [
  {
    legacy: "ADMIN",
    name: "Admin",
    color: "ember",
    position: 3,
    permissions: toMask([
      "manageTeam",
      "inviteMembers",
      "manageRequests",
      "removeMembers",
      "manageEvents",
      "manageComps",
      "manageLoot",
      "manageBuilds",
    ]),
    isDefault: false,
  },
  {
    legacy: "OFFICER",
    name: "Officer",
    color: "blue",
    position: 2,
    permissions: toMask([
      "inviteMembers",
      "manageEvents",
      "manageComps",
      "manageLoot",
      "manageBuilds",
    ]),
    isDefault: false,
  },
  {
    legacy: "MEMBER",
    name: "Member",
    color: "muted",
    position: 1,
    permissions: 0,
    isDefault: true,
  },
] as const;

export const maxTeamRoles = 25;
/** Rank of the owner: above every role. A member without roles ranks below every role. */
export const ownerRank = Number.MAX_SAFE_INTEGER;
export const noRoleRank = Number.MIN_SAFE_INTEGER;

export type TeamAccess = { owner: boolean; permissions: number; rank: number };
type HeldRole = { position: number; permissions: number };

/** Effective rights: the owner has all of them; anyone else the union of their roles. */
export function resolveAccess(owner: boolean, roles: readonly HeldRole[]): TeamAccess {
  if (owner) return { owner, permissions: allPermissions, rank: ownerRank };
  return {
    owner,
    permissions: roles.reduce((mask, role) => mask | role.permissions, 0),
    rank: rankOf(roles),
  };
}
export function rankOf(roles: readonly { position: number }[]) {
  return roles.reduce((rank, role) => Math.max(rank, role.position), noRoleRank);
}
export function can(access: TeamAccess | null | undefined, key: TeamPermission) {
  return !!access && (access.owner || (access.permissions & bit(key)) !== 0);
}
/** A role can be edited, deleted, moved or handed out only by someone ranked above it. */
export function outranksRole(access: TeamAccess, role: { position: number }) {
  return access.owner || role.position < access.rank;
}
/** A member can be removed or have roles changed only by someone ranked above them. */
export function outranksMember(access: TeamAccess, targetRank: number) {
  return access.owner || targetRank < access.rank;
}
/** A role's flags may only change in ways the editor could do themselves (no escalation). */
export function canGrant(access: TeamAccess, before: number, after: number) {
  return access.owner || ((before ^ after) & ~access.permissions) === 0;
}
