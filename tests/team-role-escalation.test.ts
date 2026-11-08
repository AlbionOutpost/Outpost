import { beforeEach, describe, expect, it, vi } from "vitest";
import { toMask } from "@/lib/groups/permissions";

/* A role holder can hand out, delete or make default only roles whose rights they hold: a role
 * ranked below them that carries more would otherwise raise them (or an alt) above their rights. */
type Role = {
  id: string;
  groupId: string;
  position: number;
  permissions: number;
  isDefault: boolean;
};
let roles: Role[] = [];
let held: { userId: string; roleId: string }[] = [];
const owner = "owner";

const tx = {
  group: { findUnique: async () => ({ id: "team", ownerId: owner, visibility: "PRIVATE" }) },
  groupMember: {
    findUnique: async ({ where }: { where: { groupId_userId: { userId: string } } }) => {
      const userId = where.groupId_userId.userId;
      if (!["owner", "recruiter", "alt"].includes(userId)) return null;
      return {
        userId,
        roles: held
          .filter((h) => h.userId === userId)
          .map((h) => ({ role: roles.find((r) => r.id === h.roleId)! })),
      };
    },
  },
  groupCustomRole: {
    findFirst: async ({ where }: { where: { id?: string; isDefault?: boolean } }) =>
      roles.find((r) => (where.id ? r.id === where.id : r.isDefault)) ?? null,
    findMany: async () => roles,
    update: async ({ where, data }: { where: { id: string }; data: Partial<Role> }) =>
      Object.assign(
        roles.find((r) => r.id === where.id)!,
        data,
      ),
    updateMany: async ({ data }: { data: Partial<Role> }) => {
      roles.forEach((r) => Object.assign(r, data));
      return { count: roles.length };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      roles = roles.filter((r) => r.id !== where.id);
      held = held.filter((h) => h.roleId !== where.id);
    },
  },
  groupRoleAssignment: {
    findMany: async ({ where }: { where: { userId: string } }) =>
      held.filter((h) => h.userId === where.userId),
    createMany: async ({ data }: { data: { userId: string; roleId: string }[] }) => {
      held.push(...data);
    },
    deleteMany: async ({ where }: { where: { userId: string; roleId: { in: string[] } } }) => {
      held = held.filter((h) => !(h.userId === where.userId && where.roleId.in.includes(h.roleId)));
    },
  },
  groupInvitation: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
};
vi.mock("@/lib/db", () => ({
  db: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) },
  databaseService: () => undefined,
}));
const { mutateGroup } = await import("@/lib/groups/service");

describe("team roles cannot raise anyone above the actor's own rights", () => {
  beforeEach(() => {
    roles = [
      // Manage roles and invites, ranked 5.
      {
        id: "recruiter-role",
        groupId: "team",
        position: 5,
        permissions: toMask(["manageRoles", "inviteMembers"]),
        isDefault: false,
      },
      // Below the recruiter, but it carries the wallet and the whole team profile.
      {
        id: "treasurer",
        groupId: "team",
        position: 2,
        permissions: toMask(["manageWallet", "manageTeam"]),
        isDefault: false,
      },
      {
        id: "greeter",
        groupId: "team",
        position: 1,
        permissions: toMask(["inviteMembers"]),
        isDefault: true,
      },
    ];
    held = [{ userId: "recruiter", roleId: "recruiter-role" }];
  });

  it("refuses handing a lower role with more rights to yourself or another member", async () => {
    for (const userId of ["recruiter", "alt"])
      await expect(
        mutateGroup("team", "recruiter", {
          action: "member-roles",
          userId,
          roleIds: ["treasurer"],
        }),
      ).rejects.toMatchObject({ status: 403 });
    expect(held).toEqual([{ userId: "recruiter", roleId: "recruiter-role" }]);
  });

  it("refuses taking such a role away, deleting it or making it the default", async () => {
    held.push({ userId: "alt", roleId: "treasurer" });
    await expect(
      mutateGroup("team", "recruiter", { action: "member-roles", userId: "alt", roleIds: [] }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      mutateGroup("team", "recruiter", { action: "role-delete", roleId: "treasurer" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      mutateGroup("team", "recruiter", { action: "role-default", roleId: "treasurer" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(roles.map((r) => [r.id, r.isDefault])).toEqual([
      ["recruiter-role", false],
      ["treasurer", false],
      ["greeter", true],
    ]);
    expect(held).toContainEqual({ userId: "alt", roleId: "treasurer" });
  });

  it("still hands out lower roles whose rights the actor holds, and the owner hands out any", async () => {
    await expect(
      mutateGroup("team", "recruiter", {
        action: "member-roles",
        userId: "alt",
        roleIds: ["greeter"],
      }),
    ).resolves.toEqual({ updated: true });
    await expect(
      mutateGroup("team", owner, { action: "member-roles", userId: "alt", roleIds: ["treasurer"] }),
    ).resolves.toEqual({ updated: true });
    expect(held.filter((h) => h.userId === "alt").map((h) => h.roleId)).toEqual(["treasurer"]);
    await expect(
      mutateGroup("team", owner, { action: "role-default", roleId: "treasurer" }),
    ).resolves.toEqual({ updated: true });
  });
});
