import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const users = new Map<string, { plan: string; createdAt?: Date }>();
const groups = new Map<string, { ownerId: string }>();
const members = new Set<string>();
vi.mock("@/lib/db", () => ({
  db: {
    groupMember: {
      findUnique: async ({
        where,
      }: {
        where: { groupId_userId: { groupId: string; userId: string } };
      }) => {
        const { groupId, userId } = where.groupId_userId;
        return members.has(`${groupId}:${userId}`) ? { userId } : null;
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
    },
    group: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const g = groups.get(where.id);
        return g ? { owner: users.get(g.ownerId) ?? { plan: "FREE" } } : null;
      },
    },
  },
  databaseService: () => undefined,
}));
import { requireTeamCreation, requireTeamManagement, canCreateTeam } from "@/lib/billing/gate";
import { giveawayManagementActions } from "@/lib/billing/gate";
import { launchGrant, supporterLabel } from "@/lib/billing/plan";

const old = new Date("2026-10-01T00:00:00Z");
const late = new Date("2026-12-01T00:00:00Z");
describe("Supporter gates", () => {
  const env = { ...process.env };
  beforeEach(() => {
    users.clear();
    groups.clear();
    members.clear();
    // Accounts created after the launch closed: only a stored plan or gift counts.
    users.set("free", { plan: "FREE", createdAt: late });
    users.set("sup", { plan: "SUPPORTER", createdAt: late });
    users.set("early", { plan: "FREE", createdAt: old });
    groups.set("g-free", { ownerId: "free" });
    groups.set("g-sup", { ownerId: "sup" });
    groups.set("g-early", { ownerId: "early" });
    launchGrant.closedAt = new Date("2026-11-15T00:00:00Z");
  });
  afterEach(() => {
    process.env = { ...env };
    launchGrant.closedAt = null;
  });
  it("locks nobody while the launch grant is open, with or without billing", async () => {
    launchGrant.closedAt = null;
    delete process.env.STRIPE_SECRET_KEY;
    expect(await canCreateTeam("free")).toBe(true);
    await expect(requireTeamManagement("g-free", "event")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free")).resolves.toBeUndefined();
    expect(supporterLabel({ plan: "FREE", createdAt: late })).toBe("Launch Supporter");
    expect(supporterLabel({ plan: "SUPPORTER" })).toBe("Supporter");
  });
  it("keeps the gates on when billing is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await expect(requireTeamCreation("free")).rejects.toMatchObject({ status: 402 });
    await expect(requireTeamManagement("g-free", "event")).rejects.toMatchObject({ status: 402 });
  });
  it("needs the owner to be a Supporter to create or manage a team", async () => {
    await expect(requireTeamCreation("free")).rejects.toMatchObject({ status: 402 });
    await expect(requireTeamCreation("sup")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free", "event")).rejects.toMatchObject({ status: 402 });
    await expect(requireTeamManagement("g-sup", "event")).resolves.toBeUndefined();
    // Participation stays open on a lapsed team; the loot route passes no action and is gated.
    await expect(requireTeamManagement("g-free", "rsvp")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free", "leave")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free")).rejects.toMatchObject({ status: 402 });
    // A missing team is left to the service's 404.
    await expect(requireTeamManagement("missing", "event")).resolves.toBeUndefined();
    // Winding down stays open on a lapsed team.
    for (const a of ["remove", "transfer", "delete"])
      await expect(requireTeamManagement("g-free", a)).resolves.toBeUndefined();
  });
  it("keeps lifetime Supporter for accounts created before the launch closed", async () => {
    expect(await canCreateTeam("early")).toBe(true);
    await expect(requireTeamManagement("g-early", "event")).resolves.toBeUndefined();
    expect(supporterLabel({ plan: "FREE", createdAt: old })).toBe("Launch Supporter");
    expect(supporterLabel({ plan: "FREE", createdAt: late })).toBe("Free");
  });
  it("gates managing a giveaway like the other Team management actions", () => {
    expect([...giveawayManagementActions].sort()).toEqual(["cancel", "create", "draw", "update"]);
    expect(giveawayManagementActions.has("enter")).toBe(false);
    expect(giveawayManagementActions.has("leave")).toBe(false);
  });
  it("lets outsiders through to the service's 404 instead of revealing the owner's plan", async () => {
    members.add("g-free:free");
    await expect(requireTeamManagement("g-free", "event", "free")).rejects.toMatchObject({
      status: 402,
    });
    await expect(requireTeamManagement("g-free", "event", "stranger")).resolves.toBeUndefined();
    await expect(requireTeamManagement("missing", "event", "stranger")).resolves.toBeUndefined();
  });
});
