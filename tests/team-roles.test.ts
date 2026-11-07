import { describe, expect, it } from "vitest";
import {
  allPermissions,
  can,
  canGrant,
  fromMask,
  noRoleRank,
  outranksMember,
  outranksRole,
  permissionKeys,
  rankOf,
  resolveAccess,
  seededRoles,
  toMask,
} from "../src/lib/groups/permissions";
import { groupAction } from "../src/lib/groups/validation";

const role = (position: number, keys: string[] = []) => ({ position, permissions: toMask(keys) });

describe("team permission resolver", () => {
  it("gives the owner every permission and a rank above every role", () => {
    const owner = resolveAccess(true, []);
    expect(owner.permissions).toBe(allPermissions);
    for (const key of permissionKeys) expect(can(owner, key)).toBe(true);
    expect(outranksRole(owner, { position: 1_000_000 })).toBe(true);
    expect(outranksMember(owner, 1_000_000)).toBe(true);
  });

  it("unions the permissions of every held role and ranks by the highest", () => {
    const access = resolveAccess(false, [role(1, ["manageEvents"]), role(4, ["manageLoot"])]);
    expect(fromMask(access.permissions)).toEqual(["manageEvents", "manageLoot"]);
    expect(access.rank).toBe(4);
    expect(can(access, "manageTeam")).toBe(false);
  });

  it("gives a member without roles no rights and the lowest rank", () => {
    const access = resolveAccess(false, []);
    expect(access.permissions).toBe(0);
    expect(access.rank).toBe(noRoleRank);
    expect(rankOf([])).toBe(noRoleRank);
    expect(can(null, "manageEvents")).toBe(false);
  });

  it("keeps masks and keys in step and ignores unknown keys", () => {
    expect(fromMask(toMask(["manageRoles", "nope", "manageBuilds"]))).toEqual([
      "manageRoles",
      "manageBuilds",
    ]);
    expect(allPermissions).toBe(511);
  });
});

describe("team role hierarchy", () => {
  const officer = resolveAccess(false, [role(2, ["manageRoles", "removeMembers", "manageEvents"])]);
  it("acts only on roles strictly below the actor's highest", () => {
    expect(outranksRole(officer, { position: 1 })).toBe(true);
    expect(outranksRole(officer, { position: 2 })).toBe(false);
    expect(outranksRole(officer, { position: 3 })).toBe(false);
  });
  it("removes or re-roles only members ranked below", () => {
    expect(outranksMember(officer, 1)).toBe(true);
    expect(outranksMember(officer, noRoleRank)).toBe(true);
    expect(outranksMember(officer, 2)).toBe(false);
    expect(outranksMember(officer, 5)).toBe(false);
  });
  it("cannot grant or take away a permission the actor lacks", () => {
    expect(canGrant(officer, 0, toMask(["manageEvents"]))).toBe(true);
    expect(canGrant(officer, 0, toMask(["manageTeam"]))).toBe(false);
    // Leaving a flag the actor lacks untouched is fine; removing it is not.
    expect(canGrant(officer, toMask(["manageTeam"]), toMask(["manageTeam", "manageEvents"]))).toBe(
      true,
    );
    expect(canGrant(officer, toMask(["manageTeam"]), 0)).toBe(false);
    expect(canGrant(resolveAccess(true, []), 0, allPermissions)).toBe(true);
  });
});

describe("migration from the fixed roles", () => {
  // The old rules: editors (owner/admin/officer) shared content and invited; managers ran the team.
  const editor = ["inviteMembers", "manageEvents", "manageComps", "manageLoot", "manageBuilds"];
  const manager = [...editor, "manageTeam", "manageRequests", "removeMembers"];
  const seeded = Object.fromEntries(seededRoles.map((r) => [r.legacy, resolveAccess(false, [r])]));
  it("gives each old role exactly its old rights", () => {
    expect(new Set(fromMask(seeded.ADMIN.permissions))).toEqual(new Set(manager));
    expect(new Set(fromMask(seeded.OFFICER.permissions))).toEqual(new Set(editor));
    expect(fromMask(seeded.MEMBER.permissions)).toEqual([]);
  });
  it("keeps who can remove whom: admins remove officers and members, not admins", () => {
    expect(outranksMember(seeded.ADMIN, seeded.OFFICER.rank)).toBe(true);
    expect(outranksMember(seeded.ADMIN, seeded.MEMBER.rank)).toBe(true);
    expect(outranksMember(seeded.ADMIN, seeded.ADMIN.rank)).toBe(false);
  });
  it("leaves role management with the owner, as before", () => {
    for (const r of Object.values(seeded)) expect(can(r, "manageRoles")).toBe(false);
  });
  it("makes Member the only default", () => {
    expect(seededRoles.filter((r) => r.isDefault).map((r) => r.name)).toEqual(["Member"]);
  });
});

describe("role action validation", () => {
  it("accepts a palette colour, a short name and known flags", () => {
    expect(
      groupAction.safeParse({
        action: "role-create",
        name: "Caller",
        color: "violet",
        permissions: ["manageEvents"],
      }).success,
    ).toBe(true);
  });
  it.each([
    { name: "x".repeat(33), color: "violet", permissions: [] },
    { name: "", color: "violet", permissions: [] },
    { name: "Caller", color: "#ff0000", permissions: [] },
    { name: "Caller", color: "violet", permissions: ["admin"] },
  ])("rejects %j", (body) => {
    expect(groupAction.safeParse({ action: "role-create", ...body }).success).toBe(false);
  });
  it("no longer accepts the old fixed role change", () => {
    expect(groupAction.safeParse({ action: "role", userId: "u", role: "ADMIN" }).success).toBe(
      false,
    );
  });
});
