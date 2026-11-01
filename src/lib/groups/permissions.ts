export const groupRoles = ["OWNER", "ADMIN", "OFFICER", "MEMBER"] as const;
export type GroupRole = (typeof groupRoles)[number];
export function canEditShared(role?: string | null) {
  return role === "OWNER" || role === "ADMIN" || role === "OFFICER";
}
export function canManageMembers(role?: string | null) {
  return role === "OWNER" || role === "ADMIN";
}
